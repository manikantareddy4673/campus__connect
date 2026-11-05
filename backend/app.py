import os
import secrets

from dotenv import load_dotenv
from flask_cors import CORS
from flask import Flask, Response, jsonify, request
from postgrest import APIError
from supabase import Client, ClientOptions, create_client
from supabase_auth.errors import (
    AuthApiError,
    AuthInvalidJwtError,
    AuthRetryableError,
)

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured."
    )

app = Flask(__name__)
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)


def create_auth_client() -> Client:
    return create_client(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        ClientOptions(auto_refresh_token=False, persist_session=False),
    )


def get_auth_credentials() -> tuple[str | None, str | None, tuple[Response, int] | None]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, None, (jsonify({"error": "A JSON request body is required."}), 400)

    email = payload.get("email")
    password = payload.get("password")
    if not isinstance(email, str) or not email.strip():
        return None, None, (jsonify({"error": "A valid email is required."}), 400)
    if not isinstance(password, str) or not password:
        return None, None, (jsonify({"error": "A password is required."}), 400)

    return email.strip(), password, None


def auth_error_response(error: AuthApiError) -> tuple[Response, int]:
    if 400 <= error.status < 500:
        return jsonify({"error": error.message}), error.status

    app.logger.error("Supabase authentication failed with status %s.", error.status)
    return jsonify({"error": "Authentication service unavailable."}), 503


def get_authenticated_context() -> (
    tuple[Client | None, str | None, tuple[Response, int] | None]
):
    authorization = request.headers.get("Authorization", "")
    scheme, _, access_token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not access_token:
        return None, None, (
            jsonify({"error": "A bearer token is required."}),
            401,
        )

    try:
        user_response = supabase.auth.get_user(access_token)
    except (AuthApiError, AuthInvalidJwtError) as error:
        if isinstance(error, AuthApiError) and error.status >= 500:
            app.logger.exception("Supabase authentication failed.")
            return None, None, (
                jsonify({"error": "Authentication service unavailable."}),
                503,
            )
        return None, None, (
            jsonify({"error": "The bearer token is invalid or expired."}),
            401,
        )
    except AuthRetryableError:
        app.logger.exception("Supabase authentication service is unavailable.")
        return None, None, (
            jsonify({"error": "Authentication service unavailable."}),
            503,
        )

    if user_response is None or user_response.user is None:
        return None, None, (
            jsonify({"error": "The bearer token is invalid or expired."}),
            401,
        )

    authenticated_client = create_client(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        ClientOptions(
            headers={"Authorization": f"Bearer {access_token}"},
            auto_refresh_token=False,
            persist_session=False,
        ),
    )
    authenticated_client.postgrest.auth(access_token)
    return authenticated_client, user_response.user.id, None


@app.post("/api/auth/signup")
def sign_up() -> Response | tuple[Response, int]:
    email, password, validation_error = get_auth_credentials()
    if validation_error is not None:
        return validation_error

    try:
        result = create_auth_client().auth.sign_up(
            {"email": email, "password": password}
        )
    except AuthApiError as error:
        return auth_error_response(error)
    except AuthRetryableError:
        app.logger.exception("Supabase authentication service is unavailable.")
        return jsonify({"error": "Authentication service unavailable."}), 503

    user = result.user
    session = result.session
    if session is None:
        return jsonify(
            {
                "requires_email_confirmation": True,
                "user": {"id": user.id, "email": user.email} if user else None,
            }
        ), 201

    return jsonify(
        {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user": {"id": user.id, "email": user.email} if user else None,
        }
    ), 201


@app.post("/api/auth/login")
def sign_in() -> Response | tuple[Response, int]:
    email, password, validation_error = get_auth_credentials()
    if validation_error is not None:
        return validation_error

    try:
        result = create_auth_client().auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except AuthApiError as error:
        return auth_error_response(error)
    except AuthRetryableError:
        app.logger.exception("Supabase authentication service is unavailable.")
        return jsonify({"error": "Authentication service unavailable."}), 503

    if result.session is None or result.user is None:
        return jsonify({"error": "Authentication did not return a user session."}), 502

    return jsonify(
        {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user": {"id": result.user.id, "email": result.user.email},
        }
    )


@app.get("/api/users")
def index() -> str:
    try:
        response = supabase.table("users").select("*").execute()
    except APIError as error:
        return f'<p>Error loading users: {error.message}</p>'

    html = "<h1>Users</h1><ul>"
    for user in response.data:
        html += f'<li>{user["email"]}</li>'
    html += "</ul>"
    return html


@app.get("/healthz")
def health_check() -> Response:
    return jsonify({"status": "ok"})


def events_database_error(error: APIError) -> tuple[Response, int]:
    if error.code == "PGRST205":
        message = (
            "Supabase is missing public.campus_events. Set SUPABASE_URL to the "
            "EventHub project and apply its database migration."
        )
        status = 503
    elif error.code == "42501":
        message = (
            "Supabase cannot read public.campus_events. Apply the EventHub "
            "database migration to grant public event access."
        )
        status = 503
    else:
        message = "Failed to load events."
        status = 500

    app.logger.error("Event query failed (PostgREST %s): %s", error.code, error.message)
    return jsonify({"error": message}), status


@app.get("/api/events")
def list_events() -> Response | tuple[Response, int]:
    try:
        response = (
            supabase.table("campus_events")
            .select("*")
            .eq("is_published", True)
            .order("starts_at")
            .execute()
        )
    except APIError as error:
        return events_database_error(error)

    return jsonify(response.data)


@app.get("/api/events/<event_id>")
def get_event(event_id: str) -> Response | tuple[Response, int]:
    try:
        response = (
            supabase.table("campus_events")
            .select("*")
            .eq("id", event_id)
            .eq("is_published", True)
            .limit(1)
            .execute()
        )
    except APIError as error:
        if error.code in {"PGRST205", "42501"}:
            return events_database_error(error)
        app.logger.error(
            "Event query failed for %s (PostgREST %s): %s",
            event_id,
            error.code,
            error.message,
        )
        return jsonify({"error": "Failed to load event."}), 500

    if not response.data:
        return jsonify({"error": "Event not found."}), 404

    return jsonify(response.data[0])


@app.post("/api/registrations")
def create_registration() -> Response | tuple[Response, int]:
    client, user_id, auth_error = get_authenticated_context()
    if auth_error is not None:
        return auth_error
    assert client is not None and user_id is not None

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("event_id"), str):
        return jsonify({"error": "A string event_id is required."}), 400

    event_id = payload["event_id"].strip()
    if not event_id:
        return jsonify({"error": "A string event_id is required."}), 400
    payment_method = payload.get("payment_method")
    if payment_method not in {None, "UPI", "Card", "Net Banking", "Wallet"}:
        return jsonify({"error": "Unsupported payment method."}), 400

    try:
        event_response = (
            client.table("campus_events")
            .select("id,seats_left")
            .eq("id", event_id)
            .eq("is_published", True)
            .limit(1)
            .execute()
        )
        if not event_response.data:
            return jsonify({"error": "Event not found."}), 404
        if event_response.data[0]["seats_left"] <= 0:
            return jsonify({"error": "This event is full."}), 409

        existing_response = (
            client.table("campus_registrations")
            .select("id")
            .eq("event_id", event_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if existing_response.data:
            return jsonify({"error": "You are already registered for this event."}), 409

        response = (
            client.table("campus_registrations")
            .insert(
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "confirmation_code": f"EH-{secrets.token_hex(4).upper()}",
                    "payment_method": payment_method,
                }
            )
            .select("*")
            .execute()
        )
    except APIError as error:
        if error.code == "23505":
            return jsonify({"error": "You are already registered for this event."}), 409
        if error.code == "P0001":
            return jsonify({"error": error.message or "This event is full."}), 409
        app.logger.exception("Failed to create registration.")
        return jsonify({"error": "Failed to create registration."}), 500

    if not response.data:
        app.logger.error("Registration insert returned no row.")
        return jsonify({"error": "Failed to create registration."}), 500

    return jsonify(response.data[0]), 201


@app.get("/api/me/registrations")
def get_my_registrations() -> Response | tuple[Response, int]:
    client, user_id, auth_error = get_authenticated_context()
    if auth_error is not None:
        return auth_error
    assert client is not None and user_id is not None

    try:
        response = (
            client.table("campus_registrations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except APIError:
        app.logger.exception("Failed to load the user's registrations.")
        return jsonify({"error": "Failed to load registrations."}), 500

    return jsonify(response.data)


@app.get("/api/events/<event_id>/registrations")
def get_event_registrations(event_id: str) -> Response | tuple[Response, int]:
    return jsonify(
        {
            "error": (
                "Organizer attendee access is unavailable until the database "
                "supports event ownership and organizer-only registration access."
            )
        }
    ), 501


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
    )
