import os

from dotenv import load_dotenv
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
supabase: Client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)


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
        ClientOptions(headers={"Authorization": f"Bearer {access_token}"}),
    )
    return authenticated_client, user_response.user.id, None


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


@app.get("/api/events")
def list_events() -> Response | tuple[Response, int]:
    try:
        response = supabase.table("events").select("*").execute()
    except APIError:
        app.logger.exception("Failed to load events.")
        return jsonify({"error": "Failed to load events."}), 500

    return jsonify(response.data)


@app.get("/api/events/<event_id>")
def get_event(event_id: str) -> Response | tuple[Response, int]:
    try:
        response = (
            supabase.table("events")
            .select("*")
            .eq("id", event_id)
            .limit(1)
            .execute()
        )
    except APIError:
        app.logger.exception("Failed to load event %s.", event_id)
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

    try:
        event_response = (
            client.table("events")
            .select("id")
            .eq("id", event_id)
            .limit(1)
            .execute()
        )
        if not event_response.data:
            return jsonify({"error": "Event not found."}), 404

        existing_response = (
            client.table("registrations")
            .select("id")
            .eq("event_id", event_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if existing_response.data:
            return jsonify({"error": "You are already registered for this event."}), 409

        response = (
            client.table("registrations")
            .insert({"event_id": event_id, "user_id": user_id})
            .execute()
        )
    except APIError as error:
        if error.code == "23505":
            return jsonify({"error": "You are already registered for this event."}), 409
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
            client.table("registrations")
            .select("id,event_id,user_id,created_at")
            .eq("user_id", user_id)
            .execute()
        )
    except APIError:
        app.logger.exception("Failed to load the user's registrations.")
        return jsonify({"error": "Failed to load registrations."}), 500

    return jsonify(response.data)


@app.get("/api/events/<event_id>/registrations")
def get_event_registrations(event_id: str) -> Response | tuple[Response, int]:
    client, user_id, auth_error = get_authenticated_context()
    if auth_error is not None:
        return auth_error
    assert client is not None and user_id is not None

    try:
        event_response = (
            client.table("events")
            .select("organizer_id")
            .eq("id", event_id)
            .limit(1)
            .execute()
        )
        if not event_response.data:
            return jsonify({"error": "Event not found."}), 404
        if event_response.data[0]["organizer_id"] != user_id:
            return jsonify({"error": "Only the event organizer can view registrations."}), 403

        response = (
            client.table("registrations")
            .select("id,event_id,user_id,created_at")
            .eq("event_id", event_id)
            .execute()
        )
    except APIError:
        app.logger.exception("Failed to load registrations for event %s.", event_id)
        return jsonify({"error": "Failed to load event registrations."}), 500

    return jsonify(response.data)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
    )
