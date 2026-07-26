import { setUserPlan } from "@/lib/firestore";

await setUserPlan({
  planId: "business",
  planName: "Business",
  price: 22500,
  websites: 100,
  checkInterval: 1,
  startedAt: new Date().toISOString(),
  status: "active",
});
