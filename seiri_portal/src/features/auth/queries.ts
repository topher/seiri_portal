import { currentUser } from "@clerk/nextjs/server";

export const getCurrent = async () => {
  try {
    const user = await currentUser();
    
    if (!user) return null;
    
    // Transform Clerk user to match Appwrite structure
    return {
      $id: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      prefs: {},
    };
  } catch {
    return null;
  }
};
