import logging
import os
from typing import Any
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field, field_validator
from postgrest import APIError
from supabase import Client, ClientOptions, create_client
from supabase_auth.errors import (
    AuthApiError,
    AuthInvalidJwtError,
    AuthRetryableError,
)

load_dotenv()
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured."
    )

app = FastAPI(title="EventHub API", version="2.1.0")
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
bearer_scheme = HTTPBearer(auto_error=False)


class AuthCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    capacity: int = Field(ge=0)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Title must not be blank.")
        return title


class RegistrationCreate(BaseModel):
    event_id: UUID


def create_auth_client() -> Client:
    return create_client(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        ClientOptions(auto_refresh_token=False, persist_session=False),
    )


def get_authenticated_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> tuple[Client, str]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(access_token)
    except (AuthApiError, AuthInvalidJwtError) as error:
        if isinstance(error, AuthApiError) and error.status >= 500:
            logger.exception("Supabase authentication failed.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable.",
            ) from error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The bearer token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    except AuthRetryableError as error:
        logger.exception("Supabase authentication service is unavailable.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        ) from error

    if user_response is None or user_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The bearer token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client = create_client(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        ClientOptions(auto_refresh_token=False, persist_session=False),
    )
    client.postgrest.auth(access_token)
    return client, str(user_response.user.id)


def auth_error_response(error: AuthApiError) -> HTTPException:
    if 400 <= error.status < 500:
        return HTTPException(status_code=error.status, detail=error.message)
    logger.error("Supabase authentication failed with status %s.", error.status)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication service unavailable.",
    )


def database_error(error: APIError, table: str) -> HTTPException:
    logger.error(
        "Supabase query for public.%s failed (%s): %s",
        table,
        error.code,
        error.message,
    )
    if error.code == "PGRST202":
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Supabase cannot find the required database function or schema "
                "resource. Apply backend/migrations/001_eventhub_schema.sql and "
                "reload the Supabase API schema."
            ),
        )
    if error.code == "PGRST205":
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Supabase cannot find public.{table}. This API uses only the "
                "users, events, and registrations tables shown in the EventHub "
                "schema. Apply backend/migrations/001_eventhub_schema.sql to "
                "the Supabase project configured in Render."
            ),
        )
    if error.code == "42501":
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Supabase denied access to public.{table}. Check the migration grants and RLS policies.",
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to access public.{table}.",
    )


def get_registration_counts(client: Client, event_ids: list[str]) -> dict[str, int]:
    if not event_ids:
        return {}
    try:
        result = client.rpc(
            "get_event_registration_counts", {"event_ids": event_ids}
        ).execute()
    except APIError as error:
        raise database_error(error, "registrations") from error
    return {
        row["event_id"]: int(row["registered_count"])
        for row in result.data
    }


def event_response(row: dict[str, Any], registered_count: int = 0) -> dict[str, Any]:
    capacity = int(row["capacity"])
    event = {
        **row,
        "id": row["event_id"],
        "registered_count": registered_count,
        "seats_left": max(0, capacity - registered_count),
    }
    return event


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "EventHub API", "docs": "/docs", "health": "/healthz"}


@app.get("/healthz")
def health_check() -> dict[str, str]:
    return {"status": "ok", "framework": "FastAPI", "version": app.version}


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def sign_up(credentials: AuthCredentials) -> dict[str, Any]:
    try:
        result = create_auth_client().auth.sign_up(
            {"email": str(credentials.email), "password": credentials.password}
        )
    except AuthApiError as error:
        raise auth_error_response(error) from error
    except AuthRetryableError as error:
        logger.exception("Supabase authentication service is unavailable.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        ) from error

    user = result.user
    session = result.session
    if session is None:
        return {
            "requires_email_confirmation": True,
            "user": (
                {"id": str(user.id), "email": user.email} if user is not None else None
            ),
        }
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user": {"id": str(user.id), "email": user.email} if user else None,
    }


@app.post("/api/auth/login")
def sign_in(credentials: AuthCredentials) -> dict[str, Any]:
    try:
        result = create_auth_client().auth.sign_in_with_password(
            {"email": str(credentials.email), "password": credentials.password}
        )
    except AuthApiError as error:
        raise auth_error_response(error) from error
    except AuthRetryableError as error:
        logger.exception("Supabase authentication service is unavailable.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        ) from error

    if result.session is None or result.user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Authentication did not return a user session.",
        )
    return {
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "user": {"id": str(result.user.id), "email": result.user.email},
    }


@app.get("/api/users/me")
def get_my_profile(
    context: tuple[Client, str] = Depends(get_authenticated_context),
) -> dict[str, Any]:
    client, user_id = context
    try:
        result = (
            client.table("users")
            .select("uuid,email,role")
            .eq("uuid", user_id)
            .limit(1)
            .execute()
        )
    except APIError as error:
        raise database_error(error, "users") from error
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Apply the auth-user sync trigger migration.",
        )
    return result.data[0]


@app.get("/api/events")
def list_events() -> list[dict[str, Any]]:
    try:
        result = (
            supabase.table("events")
            .select("event_id,student_id,title,capacity,created_at")
            .order("created_at", desc=True)
            .execute()
        )
    except APIError as error:
        raise database_error(error, "events") from error

    rows = result.data
    counts = get_registration_counts(
        supabase, [str(row["event_id"]) for row in rows]
    )
    return [
        event_response(row, counts.get(str(row["event_id"]), 0))
        for row in rows
    ]


@app.get("/api/events/{event_id}")
def get_event(event_id: UUID) -> dict[str, Any]:
    try:
        result = (
            supabase.table("events")
            .select("event_id,student_id,title,capacity,created_at")
            .eq("event_id", str(event_id))
            .limit(1)
            .execute()
        )
    except APIError as error:
        raise database_error(error, "events") from error
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found."
        )
    row = result.data[0]
    counts = get_registration_counts(supabase, [str(row["event_id"])])
    return event_response(row, counts.get(str(row["event_id"]), 0))


@app.post("/api/events", status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    context: tuple[Client, str] = Depends(get_authenticated_context),
) -> dict[str, Any]:
    client, user_id = context
    try:
        profile = (
            client.table("users")
            .select("role")
            .eq("uuid", user_id)
            .limit(1)
            .execute()
        )
        if not profile.data or profile.data[0]["role"] not in {"organizer", "admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="An organizer account is required to create events.",
            )
        result = (
            client.table("events")
            .insert(
                {
                    "student_id": user_id,
                    "title": payload.title.strip(),
                    "capacity": payload.capacity,
                }
            )
            .select("event_id,student_id,title,capacity,created_at")
            .execute()
        )
    except APIError as error:
        raise database_error(error, "events") from error
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Event creation returned no row.",
        )
    return event_response(result.data[0])


@app.post("/api/registrations", status_code=status.HTTP_201_CREATED)
def create_registration(
    payload: RegistrationCreate,
    context: tuple[Client, str] = Depends(get_authenticated_context),
) -> dict[str, Any]:
    client, user_id = context
    event_id = str(payload.event_id)
    try:
        event = (
            client.table("events")
            .select("event_id")
            .eq("event_id", event_id)
            .limit(1)
            .execute()
        )
        if not event.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event not found."
            )
        result = (
            client.table("registrations")
            .insert({"student_id": user_id, "event_id": event_id})
            .select("id,student_id,event_id,created_at")
            .execute()
        )
    except APIError as error:
        if error.code == "23505":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already registered for this event.",
            ) from error
        if error.code == "P0001":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error.message or "This event is full.",
            ) from error
        raise database_error(error, "registrations") from error
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration insert returned no row.",
        )
    registration = result.data[0]
    registration["confirmation_code"] = confirmation_code(registration["id"])
    return registration


def confirmation_code(registration_id: str) -> str:
    return f"REG-{registration_id.replace('-', '')[:8].upper()}"


@app.get("/api/registrations")
@app.get("/api/me/registrations", include_in_schema=False)
def get_my_registrations(
    context: tuple[Client, str] = Depends(get_authenticated_context),
) -> list[dict[str, Any]]:
    client, user_id = context
    try:
        result = (
            client.table("registrations")
            .select("id,student_id,event_id,created_at")
            .eq("student_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except APIError as error:
        raise database_error(error, "registrations") from error
    return [
        {**row, "confirmation_code": confirmation_code(row["id"])}
        for row in result.data
    ]


@app.get("/api/events/{event_id}/registrations")
def get_event_registrations(
    event_id: UUID,
    context: tuple[Client, str] = Depends(get_authenticated_context),
) -> list[dict[str, Any]]:
    client, user_id = context
    try:
        event = (
            client.table("events")
            .select("student_id")
            .eq("event_id", str(event_id))
            .limit(1)
            .execute()
        )
        if not event.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event not found."
            )
        if event.data[0]["student_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the event organizer can view registrations.",
            )
        result = (
            client.table("registrations")
            .select("id,student_id,event_id,created_at")
            .eq("event_id", str(event_id))
            .order("created_at", desc=True)
            .execute()
        )
        student_ids = sorted({row["student_id"] for row in result.data})
        if not student_ids:
            return []
        users = (
            client.table("users")
            .select("uuid,email")
            .in_("uuid", student_ids)
            .execute()
        )
    except HTTPException:
        raise
    except APIError as error:
        raise database_error(error, "registrations") from error

    email_by_id = {user["uuid"]: user["email"] for user in users.data}
    return [
        {**row, "email": email_by_id.get(row["student_id"])}
        for row in result.data
    ]
