import os

import streamlit as st
from dotenv import load_dotenv
from google import genai

load_dotenv()

MODEL = "gemini-4-hydrogen"

SYSTEM_PROMPT = """You are a warm, encouraging career coach for moms returning to work
after years at home with their kids.

Your goals, in order:
1. Learn about her: past work or education, what she has managed at home
   (schedules, budgets, events, volunteering, caregiving), what she enjoys,
   how many hours she can work, childcare limits, and remote or local.
2. Translate what she tells you into professional skills, in plain words.
   Example: "ran the school book fair" -> event planning, vendor coordination,
   cash handling.
3. Build her confidence. Be specific and honest, never syrupy.
4. Suggest 2-3 kinds of programs, training, or jobs that fit her.
5. End with 3-5 concrete next steps she can do this week.

Ask ONE question at a time. Keep replies short (under 120 words) until you
give her the final summary. Do not invent specific program names, websites,
or phone numbers; describe the type of program instead."""

GREETING = (
    "Hi! I'm here to help you see the skills you already have and find a "
    "next step toward work that fits your life. To start: what have you been "
    "busy with these last few years?"
)

st.set_page_config(page_title="Back to Work Coach", page_icon="🌱")
st.title("🌱 Back to Work Coach")


@st.cache_resource
def get_client():
    api_key = os.environ.get("GEMINI_API_KEY") or st.secrets.get("GEMINI_API_KEY")
    return genai.Client(api_key=api_key)


if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": GREETING}]
    st.session_state.last_interaction_id = None

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])


def stream_reply(user_text):
    # The server keeps the conversation; each turn links to the previous one.
    # The first turn also sends the greeting so the model knows what it asked.
    is_first_turn = st.session_state.last_interaction_id is None
    model_input = (
        f'(You opened with: "{GREETING}")\n\n{user_text}' if is_first_turn else user_text
    )
    stream = get_client().interactions.create(
        model=MODEL,
        system_instruction=SYSTEM_PROMPT,
        input=model_input,
        previous_interaction_id=st.session_state.last_interaction_id,
        stream=True,
    )
    for event in stream:
        if event.event_type == "interaction.created":
            st.session_state.last_interaction_id = event.interaction.id
        elif event.event_type == "step.delta" and event.delta.type == "text":
            yield event.delta.text


if user_text := st.chat_input("Type your answer..."):
    st.session_state.messages.append({"role": "user", "content": user_text})
    with st.chat_message("user"):
        st.markdown(user_text)
    with st.chat_message("assistant"):
        reply = st.write_stream(stream_reply(user_text))
    st.session_state.messages.append({"role": "assistant", "content": reply})
