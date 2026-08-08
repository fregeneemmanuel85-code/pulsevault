export interface SmallTalkResult {
  handled: boolean;
  response: string;
}

// ── Greetings ──
const GREETINGS = /^(hi+|hello|hey|yo|hiya|howdy|greetings|what'?s up|sup)\b/i;
const TIME_GREETING = /good (morning|afternoon|evening|night)\b/i;

// ── Well-being ──
const HOW_ARE_YOU = /how (are you|is it going|are things|have you been)\b/i;
const HOWS_DAY = /how'?s (your day|everything|it going)\b/i;
const ARE_YOU_OKAY = /are you (okay|ok|alright|fine)\b/i;
const WHATS_UP = /^what'?s up\??$/i;
const HOW_ARE_THINGS = /how are things\b/i;

// ── Help requests ──
const CAN_YOU_HELP = /^(can you help me|i need help|help me)\??$/i;
const IM_CONFUSED = /^(i'?m confused|i don'?t understand|can you explain)\??$/i;
const NEED_ASSISTANCE = /^(i need (some )?assistance|assist me)\b/i;

// ── Identity / Capability ──
const WHO_ARE_YOU = /who (are you|is this)\b/i;
const WHAT_CAN_YOU_DO = /what (can you do|do you do|are you capable of)\b/i;
const ARE_YOU_AI = /are you (an ai|a bot|a robot|human|real)\b/i;
const WHAT_IS_PV = /what is (pv assistant|pulsevault assistant)\b/i;
const HOW_DO_YOU_WORK = /how do you (work|function|operate)\b/i;

// ── Gratitude ──
const THANKS =
  /\b(thank you|thanks|thx|appreciate it|thank you so much|ty|that helped|that was helpful)\b/i;

// ── Goodbyes ──
const GOODBYE =
  /\b(bye|goodbye|see you|talk later|catch you later|later|peace|i'?m done|that'?s all)\b/i;

// ── Acknowledgments ──
const OKAY =
  /^(ok|okay|cool|nice|great|awesome|perfect|got it|alright|sure)\b/i;

export function handleSmallTalk(message: string): SmallTalkResult {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (GREETINGS.test(lower)) {
    return {
      handled: true,
      response:
        "Hey there! 👋 I'm PV Assistant. How can I help with your websites today?",
    };
  }

  if (TIME_GREETING.test(lower)) {
    const hour = new Date().getHours();
    let time = "day";
    if (hour < 12) time = "morning";
    else if (hour < 17) time = "afternoon";
    else time = "evening";
    return {
      handled: true,
      response: `Good ${time}! ☀️ Ready to help you monitor and fix your websites. What would you like to check?`,
    };
  }

  // Well-being
  if (HOW_ARE_YOU.test(lower) || HOWS_DAY.test(lower)) {
    return {
      handled: true,
      response:
        "I'm doing great — always monitoring! 🛡️ What about your websites? Need me to check anything?",
    };
  }

  if (ARE_YOU_OKAY.test(lower)) {
    return {
      handled: true,
      response:
        "I'm all good! Just here to help with your websites. What do you need? 🛡️",
    };
  }

  if (WHATS_UP.test(lower) || HOW_ARE_THINGS.test(lower)) {
    return {
      handled: true,
      response:
        "Not much — just keeping an eye on your sites! 👀 What can I do for you?",
    };
  }

  // Help requests
  if (CAN_YOU_HELP.test(lower) || NEED_ASSISTANCE.test(lower)) {
    return {
      handled: true,
      response:
        "Of course! I can check your website health, explain issues, suggest fixes, write code, or answer questions about PulseVault. What do you need help with? 🤔",
    };
  }

  if (IM_CONFUSED.test(lower)) {
    return {
      handled: true,
      response:
        "No worries! Ask me about your website health scores, SSL issues, broken links, SEO problems, or paste code you need help with. I'm here to explain! 💡",
    };
  }

  // Identity
  if (WHO_ARE_YOU.test(lower)) {
    return {
      handled: true,
      response:
        "I'm PV Assistant — your DevOps and web performance analyst inside PulseVault. I help you monitor websites, explain issues, suggest fixes, and write code. 🛡️",
    };
  }

  if (WHAT_CAN_YOU_DO.test(lower)) {
    return {
      handled: true,
      response:
        "I can check your website health scores, explain SSL/DNS issues, analyze broken links, suggest performance fixes, write and debug code, and answer tech questions. Just ask! 🚀",
    };
  }

  if (ARE_YOU_AI.test(lower)) {
    return {
      handled: true,
      response:
        "Yep, I'm an AI assistant built into PulseVault! I use your dashboard data to give you personalized help. 🤖",
    };
  }

  if (WHAT_IS_PV.test(lower)) {
    return {
      handled: true,
      response:
        "PV Assistant is your built-in PulseVault helper. I analyze your websites, alert you to issues, and help you fix them with code and advice. 🛡️",
    };
  }

  if (HOW_DO_YOU_WORK.test(lower)) {
    return {
      handled: true,
      response:
        "I read your PulseVault dashboard data — health scores, alerts, SSL status, broken links, and more — then give you personalized fixes and code. No data leaves your account. 🔒",
    };
  }

  // Gratitude
  if (THANKS.test(lower)) {
    return {
      handled: true,
      response:
        "You're welcome! 🙌 Happy to help. Let me know if anything else comes up.",
    };
  }

  // Goodbyes
  if (GOODBYE.test(lower)) {
    return {
      handled: true,
      response:
        "See you later! 👋 I'll keep an eye on your sites while you're away.",
    };
  }

  // Acknowledgments
  if (OKAY.test(lower) && lower.length < 25) {
    return {
      handled: true,
      response: "Got it! Let me know if you need anything else.",
    };
  }

  return { handled: false, response: "" };
}
