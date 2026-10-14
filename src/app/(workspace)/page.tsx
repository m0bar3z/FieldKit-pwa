import { withAuthentication } from "@/components/auth/authenticated-page";
import { DashboardPage } from "@/components/fieldkit/pages/dashboard-page";

export default withAuthentication(DashboardPage);
