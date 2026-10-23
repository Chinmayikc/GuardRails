import { redirect } from "next/navigation";

// Keep old account links working without presenting an authentication wall.
// Private workspace APIs and actions continue to enforce authentication.
export default function AccountPage() {
  redirect("/workspace");
}
