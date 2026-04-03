# Core — Analytics Events

All events are lightweight and designed for tools like Amplitude, Mixpanel, or PostHog.

## User Properties (attached to every event)

| Property     | Type   | Description                |
|-------------|--------|----------------------------|
| `user_id`   | string | Authenticated user ID      |
| `session_id`| string | Current active session ID  |

---

## Events

### Auth

| Event Name        | Description                     | Properties |
|-------------------|---------------------------------|------------|
| `user_signed_up`  | User created a new account      | —          |
| `user_signed_in`  | User logged in                  | —          |
| `user_signed_out` | User logged out                 | —          |

### Onboarding

| Event Name             | Description                        | Properties          |
|------------------------|------------------------------------|---------------------|
| `onboarding_started`   | User entered onboarding flow       | —                   |
| `onboarding_completed` | User finished onboarding           | `intent`: string    |

### Session

| Event Name       | Description                        | Properties                                          |
|------------------|------------------------------------|-----------------------------------------------------|
| `session_started`| User started a new conversation    | `session_id`: string                                |
| `session_ended`  | User ended a conversation          | `session_id`, `duration_sec`, `message_count`       |

### Chat

| Event Name          | Description                      | Properties                        |
|---------------------|----------------------------------|-----------------------------------|
| `message_sent`      | User sent a message              | `session_id`, `mode` (text/voice) |
| `response_received` | AI response fully received       | `session_id`                      |

### Mode

| Event Name     | Description                     | Properties         |
|----------------|---------------------------------|--------------------|
| `mode_changed` | User toggled text/voice mode    | `mode` (text/voice)|

### Voice

| Event Name            | Description                    | Properties |
|-----------------------|--------------------------------|------------|
| `voice_listen_started`| Mic activated for recording    | —          |
| `voice_listen_stopped`| Mic deactivated                | —          |
| `tts_played`          | TTS audio started playback     | —          |

### Navigation

| Event Name       | Description                     | Properties        |
|------------------|---------------------------------|-------------------|
| `screen_viewed`  | User navigated to a screen      | `screen`: string  |
| `history_opened` | User opened a past session      | `session_id`      |

### Feedback

| Event Name           | Description                  | Properties |
|----------------------|------------------------------|------------|
| `feedback_submitted` | User submitted feedback      | —          |
