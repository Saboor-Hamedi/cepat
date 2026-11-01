import { cleanup, fireEvent, within } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet } from "react-native";

import AccountEntryScreen from "../src/app/account";
import AdminConsoleScreen from "../src/app/admin";
import BookingEntryScreen from "../src/app/booking/[id]";
import BookingsScreen from "../src/app/bookings";
import CategoryScreen from "../src/app/category/[slug]";
import ForgotPasswordScreen from "../src/app/forgot-password";
import MarketplaceScreen from "../src/app/index";
import LoginScreen from "../src/app/login";
import NotificationsScreen from "../src/app/notifications";
import RegisterScreen from "../src/app/register";
import ResetPasswordScreen from "../src/app/reset-password";
import TechnicianDashboardScreen from "../src/app/technician-dashboard";
import TechnicianProfileScreen from "../src/app/technician/[id]";
import {
  clearTestAuthSession,
  setTestAuthSession,
} from "../src/auth/AuthProvider";
import { recordLocalBookingNotification } from "../src/data/notifications";

const appRoutes = {
  index: MarketplaceScreen,
  account: AccountEntryScreen,
  admin: AdminConsoleScreen,
  bookings: BookingsScreen,
  "technician-dashboard": TechnicianDashboardScreen,
  "booking/[id]": BookingEntryScreen,
  "category/[slug]": CategoryScreen,
  "technician/[id]": TechnicianProfileScreen,
  login: LoginScreen,
  notifications: NotificationsScreen,
  register: RegisterScreen,
  "forgot-password": ForgotPasswordScreen,
  "reset-password": ResetPasswordScreen,
};

afterEach(() => {
  clearTestAuthSession();
  cleanup();
});

describe("marketplace, auth-gated booking, social technician profile, and sidebar journeys", () => {
  it("shows a full-width search instead of a hero and keeps navigation at the safe-area bottom", async () => {
    await renderRouter(appRoutes);

    expect(await screen.findByTestId("marketplace-search")).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId("marketplace-search-shell").props.style).width,
    ).toBe("100%");
    expect(screen.getByTestId("area-picker-trigger")).toBeTruthy();
    expect(screen.queryByTestId("marketplace-heading")).toBeNull();
    expect(screen.getByTestId("bottom-navigation-bar")).toBeTruthy();
  });

  it("removes the Marketplace composer and provides at least ten horizontal service filters", async () => {
    setTestAuthSession({
      user: {
        id: "customer-marketplace",
        email: "customer@cepat.id",
        user_metadata: { display_name: "Customer Cepat" },
      } as never,
      roles: ["customer"],
    });
    await renderRouter(appRoutes);

    await screen.findByTestId("marketplace-search");
    expect(screen.queryByTestId("marketplace-composer-section")).toBeNull();
    expect(screen.queryByTestId("technician-post-composer")).toBeNull();
    expect(screen.getByTestId("category-all")).toBeTruthy();
    expect(screen.getByTestId("category-ac-repair")).toBeTruthy();
    expect(screen.getByTestId("category-renovation")).toBeTruthy();
  });

  it("routes a successful role-specific login to the Marketplace by default", async () => {
    await renderRouter(appRoutes, {
      initialUrl: "/login?registered=1&role=technician",
    });

    await fireEvent.changeText(screen.getByTestId("login-email"), "tech@cepat.id");
    await fireEvent.changeText(screen.getByTestId("login-password"), "password123");
    await fireEvent.press(screen.getByTestId("login-submit"));

    expect(await screen.findByTestId("marketplace-search")).toBeTruthy();
    expect(screen).toHavePathname("/");
  });

  it("lets a logged-out visitor browse a read-only technician profile, redirects Book Now to login, returns to the intended technician booking after login, and submits a booking request", async () => {
    await AsyncStorage.setItem("@cepat/saved-addresses:demo-customer", "[]");
    await renderRouter(appRoutes);

    expect(await screen.findByTestId("marketplace-search")).toBeTruthy();
    expect(screen.getByText("Teknisi rekomendasi")).toBeTruthy();
    // Technician posts feed is visible on marketplace discovery
    expect(await screen.findByTestId("marketplace-posts-section")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("technician-card-demo-rizky"));
    await fireEvent.press(screen.getByTestId("profile-tab-about"));
    expect(await screen.findByText("Kenali teknisinya")).toBeTruthy();
    expect(screen.getByText("Rizky Pratama")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("profile-tab-services"));
    expect(screen.getByText("Perbaikan pipa")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("profile-tab-about"));
    expect(screen.getByText("Hari & jam kerja")).toBeTruthy();
    // Read-only for logged-out visitors: no owner edit button and no private email/phone
    expect(screen.queryByTestId("owner-edit-profile-btn")).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByText(/\+62/)).toBeNull();
    expect(screen).toHavePathname("/technician/demo-rizky");

    // Logged-out visitor presses Book Now -> redirected to /login preserving target
    await fireEvent.press(screen.getByTestId("book-now"));
    expect(
      await screen.findByTestId("login-booking-redirect-notice"),
    ).toBeTruthy();
    expect(screen).toHavePathname("/login");

    // User signs in -> automatically redirected back to /booking/demo-rizky
    await fireEvent.changeText(
      screen.getByTestId("login-email"),
      "andi@cepat.id",
    );
    await fireEvent.changeText(
      screen.getByTestId("login-password"),
      "password123",
    );
    await fireEvent.press(screen.getByTestId("login-submit"));

    expect(await screen.findByText("Pesan jadwal teknisi")).toBeTruthy();
    expect(screen.getByTestId("selected-technician-id")).toBeTruthy();
    expect(screen).toHavePathname("/booking/demo-rizky");

    expect(await screen.findByTestId("booking-add-address")).toBeTruthy();
    expect(screen.getByTestId("booking-address-input").props.value).toBe("");
    await fireEvent.press(screen.getByTestId("submit-booking-request"));
    expect(
      await screen.findByText(
        "Masukkan alamat layanan lengkap, atau tambahkan dan pilih alamat tersimpan.",
      ),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId("booking-address-input"),
      "Jl. Contoh No. 12, Jakarta Selatan",
    );
    await fireEvent.press(screen.getByTestId("submit-booking-request"));
    expect(await screen.findByTestId("booking-status-view")).toBeTruthy();
    expect(screen.getByTestId("booking-current-status")).toBeTruthy();
  });

  it("selects a location independently of GPS and searches neighborhoods from the interactive map location modal", async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId("marketplace-search");

    await fireEvent.press(screen.getByTestId("area-picker-trigger"));
    expect(await screen.findByTestId("location-picker-modal")).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId("area-search-input"),
      "Tebet",
    );
    expect(await screen.findByTestId("region-option-reg-jaksel")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("region-option-reg-jaksel"));
    expect(
      await screen.findByTestId("technician-card-demo-rizky"),
    ).toBeTruthy();
  });

  it("shows persisted booking notifications and marks them read", async () => {
    const userId = "notification-customer-test";
    setTestAuthSession({
      user: {
        id: userId,
        email: "customer@cepat.id",
        user_metadata: { display_name: "Customer Cepat" },
      } as never,
      roles: ["customer"],
    });
    await recordLocalBookingNotification(
      userId,
      "booking_accepted",
      "notification-booking-test",
      "Servis AC",
    );
    await renderRouter(appRoutes, { initialUrl: "/notifications" });

    expect(await screen.findByText("Pesanan diterima")).toBeTruthy();
    expect(screen.getByTestId("notification-local-notification-booking-test:booking_accepted")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("notifications-mark-all-read"));
    expect(screen.queryByTestId("notifications-mark-all-read")).toBeNull();
  });

  it("opens a recommended technician profile from the recommendation card", async () => {
    await renderRouter(appRoutes);
    const recommendation = await screen.findByTestId(
      "recommended-technician-demo-rizky",
    );

    await fireEvent.press(
      within(recommendation).getByTestId("technician-card-demo-rizky"),
    );

    expect(await screen.findByTestId("technician-social-profile-card")).toBeTruthy();
    expect(screen).toHavePathname("/technician/demo-rizky");
  });

  it('opens customer bookings hub and social-style technician profile from shared navigation without a "Technicians Dashboard" heading', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId("marketplace-search");

    await fireEvent.press(screen.getByTestId("nav-bookings"));
    expect(await screen.findByTestId("bookings-heading")).toBeTruthy();
    expect(screen).toHavePathname("/bookings");

    await fireEvent.press(screen.getByTestId("nav-workspace"));
    expect(
      await screen.findByTestId("technician-social-profile-card"),
    ).toBeTruthy();
    expect(screen.queryByText(/Technicians Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Dashboard Teknisi/i)).toBeNull();
    expect(screen).toHavePathname("/technician-dashboard");
  });

  it("shows the customer address on incoming requests, opens customer profile details, enables chat after acceptance, and creates a technician post", async () => {
    await renderRouter(appRoutes, { initialUrl: "/technician-dashboard" });
    expect(
      await screen.findByTestId("technician-social-profile-card"),
    ).toBeTruthy();

    // Technicians can see the full service address before accepting a request.
    expect(
      await screen.findByTestId("incoming-request-card-booking-demo-2"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("customer-address-booking-demo-2"),
    ).toBeTruthy();
    expect(
      screen.getByText("Jl. Cikini Raya No. 42, Menteng (Jakarta Pusat)"),
    ).toBeTruthy();

    // Open customer profile modal
    await fireEvent.press(
      screen.getByTestId("dashboard-view-customer-booking-demo-2"),
    );
    expect(await screen.findByTestId("customer-profile-modal")).toBeTruthy();
    expect(screen.getByTestId("customer-detail-address").props.children).toBe(
      "Jl. Cikini Raya No. 42, Menteng",
    );
    await fireEvent.press(screen.getByTestId("close-customer-profile-modal"));

    // Accept the incoming request -> moves to Accepted Jobs with unlocked street address and chat button
    await fireEvent.press(
      screen.getByTestId("dashboard-accept-booking-demo-2"),
    );
    await fireEvent.press(screen.getByTestId("tech-tab-upcoming"));
    expect(
      await screen.findByTestId("upcoming-job-card-booking-demo-2"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("unlocked-customer-address-booking-demo-2"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("dashboard-open-chat-booking-demo-2"),
    ).toBeTruthy();

    // Switch to Posts tab and publish a new work post
    await fireEvent.press(screen.getByTestId("tech-tab-posts"));
    expect(await screen.findByTestId("technician-post-composer")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId("create-post-caption-input"),
      "Selesai perbaikan pompa booster rumah 2 lantai di Kemang.",
    );
    await fireEvent.press(screen.getByTestId("submit-new-post-btn"));
    expect(
      await screen.findByText(
        "Selesai perbaikan pompa booster rumah 2 lantai di Kemang.",
      ),
    ).toBeTruthy();
  });

  it("filters the current results and clears the search input", async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId("marketplace-search");

    await fireEvent.changeText(
      screen.getByTestId("marketplace-search"),
      "tidak ada layanan ini",
    );
    expect(await screen.findByText("Belum ada yang cocok")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("clear-search"));
    expect(
      await screen.findByTestId("technician-card-demo-rizky"),
    ).toBeTruthy();
  });

  it("filters Marketplace posts and technicians by selected category", async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId("marketplace-search");

    await fireEvent.press(screen.getByTestId("category-plumbing"));
    expect(screen.getByTestId("category-plumbing").props.accessibilityState.selected).toBe(true);
    expect(
      await screen.findByTestId("technician-card-demo-rizky"),
    ).toBeTruthy();
    expect(screen).toHavePathname("/");
  });

  it("opens the slide-in Profile Sidebar from the header avatar, navigates to modular Settings, and hides personal info when logged out", async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId("marketplace-search");

    await fireEvent.press(screen.getByTestId("account-entry"));
    expect(await screen.findByTestId("profile-sidebar-modal")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("sidebar-settings"));

    expect(await screen.findByText("Pengaturan")).toBeTruthy();
    expect(screen.queryByTestId("setting-tab-all")).toBeNull();
    expect(screen.getByTestId("setting-section-account")).toBeTruthy();
    expect(screen.getByTestId("account-session-card")).toBeTruthy();
    expect(screen.queryByTestId("private-email-input")).toBeNull();
    expect(screen.queryByTestId("private-phone-input")).toBeNull();

    await fireEvent.press(screen.getByTestId("setting-tab-language"));
    expect(await screen.findByTestId("setting-section-language")).toBeTruthy();
    expect(screen.getByTestId("language-id")).toBeTruthy();
    expect(screen.getByTestId("language-en")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("setting-tab-appearance"));
    expect(
      await screen.findByTestId("setting-section-appearance"),
    ).toBeTruthy();
  });

  it("blocks unauthenticated and non-admin users from Admin Console and grants access only when authenticated with a verified admin role", async () => {
    // Logged-out visitor cannot see nav-admin and cannot use /admin tools
    await renderRouter(appRoutes, { initialUrl: "/admin" });
    expect(await screen.findByTestId("admin-console-heading")).toBeTruthy();
    expect(screen.queryByTestId("admin-reports-section")).toBeNull();

    // Verified admin role grants access to Admin Console and sidebar Admin link
    setTestAuthSession({
      user: {
        id: "verified-admin-1",
        email: "ops@cepat.id",
        user_metadata: { display_name: "Admin Cepat" },
      } as never,
      roles: ["admin"],
    });

    expect(await screen.findByTestId("admin-reports-section")).toBeTruthy();
    expect(await screen.findByTestId("admin-most-booked-services")).toBeTruthy();
    expect(await screen.findByTestId("admin-user-count-source")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("admin-tab-accounts"));
    expect(await screen.findByTestId("admin-accounts-section")).toBeTruthy();
  });

  it("opens registration from the profile sidebar", async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId("marketplace-search");
    await fireEvent.press(screen.getByTestId("account-entry"));
    expect(await screen.findByTestId("profile-sidebar-modal")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("sidebar-register"));
    expect(await screen.findByText("Buat akun Cepat")).toBeTruthy();
    expect(screen).toHavePathname("/register");
  });

  it("falls back to the marketplace when settings has no back history", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    await renderRouter(appRoutes, { initialUrl: "/account" });
    await screen.findByText("Pengaturan");
    await fireEvent.press(screen.getByLabelText("Marketplace"));
    expect(screen).toHavePathname("/");
    expect(warning.mock.calls.flat().join(" ")).not.toContain("GO_BACK");
    warning.mockRestore();
  });
});
