export interface SmallTalkResult {
  handled: boolean;
  response: string;
}

const GREETINGS = /^(hi+|hello|hey|yo|hiya|howdy|greetings|what'?s up|sup)\b/i;
const HOW_ARE_YOU = /how (are you|is it going|are things|have you been)\b/i;
const THANKS = /(thank you|thanks|thx|appreciate it|thank you so much|ty)\b/i;
const GOODBYE = /(bye|goodbye|see you|later|catch you|peace)\b/i;
const TIME_GREETING = /good (morning|afternoon|evening|night)\b/i;
const OKAY = /^(ok|okay|cool|nice|great|awesome|perfect|got it)\b/i;
const WHO_ARE_YOU = /who (are you|is this)\b/i;
const WHAT_CAN_YOU_DO = /what (can you do|do you do|are you capable of)\b/i;
const LOVE = /(i love you|you'?re the best|you rock)\b/i;

export function handleSmallTalk(message: string): SmallTalkResult {
  const lower = message.toLowerCase().trim();

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

  if (HOW_ARE_YOU.test(lower)) {
    return {
      handled: true,
      response:
        "I'm doing great — always monitoring! 🛡️ What about your websites? Need me to check anything?",
    };
  }

  if (THANKS.test(lower)) {
    return {
      handled: true,
      response:
        "You're welcome! 🙌 Happy to help. Let me know if anything else comes up.",
    };
  }

  if (GOODBYE.test(lower)) {
    return {
      handled: true,
      response:
        "See you later! 👋 I'll keep an eye on your sites while you're away.",
    };
  }

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
        "I can check your website health scores, explain SSL/DNS issues, analyze broken links, suggest performance fixes, and write code to solve problems. Just ask! 🚀",
    };
  }

  if (LOVE.test(lower)) {
    return {
      handled: true,
      response: "Haha, thanks! ❤️ I love keeping your websites healthy too.",
    };
  }

  if (OKAY.test(lower) && lower.length < 20) {
    return {
      handled: true,
      response: "Got it! Let me know if you need anything else.",
    };
  }

  return { handled: false, response: "" };
}
