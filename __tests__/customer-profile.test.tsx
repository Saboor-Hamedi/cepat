import { render, screen, within } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  clearTestAuthSession,
  setTestAuthSession,
} from "../src/auth/AuthProvider";
import { CustomerProfileScreen } from "../src/profile/CustomerProfileScreen";
import { LanguageProvider } from "../src/i18n/locale";

function LanguageWrapper({ children }: PropsWithChildren) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

const customerSession = {
  user: {
    id: "demo-customer",
    email: "andi@cepat.id",
    user_metadata: {
      display_name: "Andi Wijaya",
      username: "andiwijaya",
      requested_account_type: "customer",
    },
  },
  roles: ["customer"],
} as never;

afterEach(() => {
  clearTestAuthSession();
});

describe("CustomerProfileScreen", () => {
  it("renders the consumer layout with hero, metric strip and tabs instead of a social feed", async () => {
    setTestAuthSession(customerSession);

    await render(<CustomerProfileScreen />, { wrapper: LanguageWrapper });

    expect(await screen.findByTestId("customer-profile-header")).toBeTruthy();
    expect(await screen.findByTestId("customer-profile-name")).toBeTruthy();
    expect(screen.getByTestId("customer-stats-bar")).toBeTruthy();
    expect(screen.getByTestId("customer-stats-completed")).toBeTruthy();
    expect(screen.getByTestId("customer-stats-favorites")).toBeTruthy();
    expect(screen.getByTestId("customer-stats-reviews")).toBeTruthy();
    expect(screen.getByTestId("customer-tab-activity")).toBeTruthy();
    expect(screen.getByTestId("customer-tab-services")).toBeTruthy();
    expect(screen.getByTestId("customer-tab-payments")).toBeTruthy();
    expect(screen.queryByTestId("post-composer")).toBeNull();
    expect(screen.queryByTestId("public-posts")).toBeNull();
  });

  it("shows the receipt, upcoming bookings and saved-address cards from real booking data", async () => {
    setTestAuthSession(customerSession);

    await render(<CustomerProfileScreen />, { wrapper: LanguageWrapper });

    const receipt = await screen.findByTestId("customer-recent-receipt");
    expect(within(receipt).getByText("Cuci AC split")).toBeTruthy();
    expect(screen.getByTestId("customer-upcoming-card")).toBeTruthy();
    expect(screen.getByTestId("customer-upcoming-booking-demo-1")).toBeTruthy();
    expect(screen.getByTestId("customer-upcoming-booking-demo-2")).toBeTruthy();
    expect(screen.getByTestId("customer-payment-method-card")).toBeTruthy();
    expect(screen.getByTestId("customer-addresses-card")).toBeTruthy();

    expect(
      within(screen.getByTestId("customer-stats-completed")).getByText("1"),
    ).toBeTruthy();
  });
});
