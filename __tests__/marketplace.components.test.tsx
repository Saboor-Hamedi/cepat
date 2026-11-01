import { fireEvent, render, screen } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import AccountEntryScreen from "../src/app/account";
import {
  clearTestAuthSession,
  setTestAuthSession,
} from "../src/auth/AuthProvider";
import {
  AppNavigationBar,
  Avatar,
  EmptyState,
  Rating,
  TechnicianCard,
} from "../src/components/marketplace-ui";
import { InlineMarketplaceMapCard } from "../src/components/MarketplaceMapSearch";
import { StrictImagePicker } from "../src/components/StrictImagePicker";
import { fixtureTechnicians, indonesianRegions } from "../src/data/fixtures";
import { LanguageProvider } from "../src/i18n/locale";
import { SettingHeader } from "../src/setting";

function LanguageWrapper({ children }: PropsWithChildren) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

afterEach(() => {
  clearTestAuthSession();
});

describe("marketplace reusable components, unified header, sidebar, and modular settings", () => {
  it("renders a single uppercase character inside the circular Avatar when no image URI is uploaded", async () => {
    await render(<Avatar name="rizky pratama" size={44} />);
    expect(screen.getByText("R")).toBeTruthy();
    expect(screen.queryByText("RP")).toBeNull();
  });

  it("renders the unified header with Cepat branding on the left, circular single-character avatar, Profile label, and no public Admin button", async () => {
    await render(<AppNavigationBar activeTab="marketplace" />, {
      wrapper: LanguageWrapper,
    });
    expect(screen.getByText("cepat")).toBeTruthy();
    expect(screen.getByTestId("account-entry")).toBeTruthy();
    expect(screen.queryByTestId("nav-admin")).toBeNull();
    expect(screen.getByText("Profile")).toBeTruthy();
  });

  it("opens the Twitter/X-style slide-in Profile Sidebar when clicking the header avatar and logs out cleanly", async () => {
    setTestAuthSession({
      user: {
        id: "demo-customer",
        email: "andi@cepat.id",
        user_metadata: {
          display_name: "Andi Wijaya",
          requested_account_type: "customer",
        },
      } as never,
      roles: ["customer"],
    });

    await render(<AppNavigationBar activeTab="marketplace" />, {
      wrapper: LanguageWrapper,
    });

    // Single-character avatar 'A' for Andi Wijaya
    expect(screen.getByText("A")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("account-entry"));
    expect(await screen.findByTestId("profile-sidebar-modal")).toBeTruthy();
    expect(screen.getByText("Andi Wijaya")).toBeTruthy();
    expect(screen.getByTestId("sidebar-view-profile")).toBeTruthy();
    expect(screen.getByTestId("sidebar-settings")).toBeTruthy();
    expect(screen.getByTestId("sidebar-preferences")).toBeTruthy();

    // Bottom Log out button with clean label "Log out" (never raw auth.signOut)
    const logoutBtn = screen.getByTestId("sidebar-logout");
    expect(screen.getByText("Log out")).toBeTruthy();
    expect(screen.queryByText("auth.signOut")).toBeNull();

    await fireEvent.press(logoutBtn);
    expect(screen.queryByTestId("profile-sidebar-modal")).toBeNull();
  });

  it("renders an explicit no-review state instead of a zero-star rating", async () => {
    await render(<Rating value={0} count={0} />);
    expect(screen.getByText("Belum ada ulasan")).toBeTruthy();
  });

  it("shows a useful empty state and invokes its retry action", async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="Tidak ditemukan"
        description="Coba lagi nanti."
        actionLabel="Coba lagi"
        onAction={onAction}
      />,
    );
    expect(screen.getByText("Tidak ditemukan")).toBeTruthy();
    fireEvent.press(screen.getByText("Coba lagi"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("exposes a technician card as a labeled navigation target", async () => {
    const onPress = jest.fn();
    await render(
      <TechnicianCard
        technician={fixtureTechnicians[0]}
        source="fixtures"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByTestId("technician-card-demo-rizky"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Lihat profil Rizky Plumbing")).toBeTruthy();
  });

  it("lets any role choose English in the dedicated Language tab and updates the modular settings interface", async () => {
    await render(<AccountEntryScreen />, { wrapper: LanguageWrapper });
    await fireEvent.press(screen.getByTestId("setting-tab-language"));
    await fireEvent.press(screen.getByTestId("language-en"));
    expect(screen.queryByTestId("nav-settings")).toBeNull();
    expect(screen.getByText("App language")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("validates Gallery and Camera selections strictly in StrictImagePicker and rejects non-image files without showing preset default images", async () => {
    const onImageValidated = jest.fn();
    let modeToReturn: "spoofed_pdf" | "valid_jpeg" = "spoofed_pdf";

    await render(
      <StrictImagePicker
        label="Foto Profil"
        onImageValidated={onImageValidated}
        testIDPrefix="test-picker"
        customPickerLauncher={async () => {
          if (modeToReturn === "spoofed_pdf") {
            return {
              uri: "file:///storage/emulated/0/Download/invoice.pdf.jpg",
              fileName: "invoice.pdf.jpg",
              mimeType: "application/pdf",
              fileSize: 120000,
              width: 400,
              height: 400,
              headerBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
            };
          }
          return {
            uri: "file:///storage/emulated/0/DCIM/Camera/IMG_20261030.jpg",
            fileName: "IMG_20261030.jpg",
            mimeType: "image/jpeg",
            fileSize: 320000,
            width: 800,
            height: 800,
            headerBytes: new Uint8Array([
              0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
            ]),
          };
        }}
      />,
      { wrapper: LanguageWrapper },
    );

    // Ensure no preset/default portrait list is shown
    expect(screen.queryByText(/Professional Portrait/i)).toBeNull();

    // Attempt to pick a spoofed PDF disguised as a JPEG from gallery
    await fireEvent.press(screen.getByTestId("test-picker-gallery-btn"));
    expect(onImageValidated).not.toHaveBeenCalled();
    expect(await screen.findByTestId("test-picker-error")).toBeTruthy();

    // Now pick a genuine JPEG from camera/gallery
    modeToReturn = "valid_jpeg";
    await fireEvent.press(screen.getByTestId("test-picker-camera-btn"));
    expect(await screen.findByTestId("test-picker-success")).toBeTruthy();
    expect(onImageValidated).toHaveBeenCalledWith(
      "file:///storage/emulated/0/DCIM/Camera/IMG_20261030.jpg",
    );
  });

  it("shows the signed-in user's name without a public-profile editor tab", async () => {
    await render(
      <SettingHeader
        activeSection="account"
        onSelectSection={jest.fn()}
        isAuthenticated
        userName="Rizky Pratama"
        userRole="technician"
      />,
      { wrapper: LanguageWrapper },
    );
    expect(await screen.findByTestId("settings-user-identity")).toBeTruthy();
    expect(screen.getByText("Rizky Pratama")).toBeTruthy();
    expect(screen.queryByTestId("setting-tab-profile")).toBeNull();
  });

  it("renders the interactive InlineMarketplaceMapCard and opens the map search modal on press", async () => {
    const onSelectArea = jest.fn();
    const onOpenFullMap = jest.fn();
    await render(
      <InlineMarketplaceMapCard
        selectedArea="Jakarta Selatan"
        regions={indonesianRegions}
        technicians={fixtureTechnicians}
        onSelectArea={onSelectArea}
        onOpenFullMap={onOpenFullMap}
      />,
      { wrapper: LanguageWrapper },
    );

    expect(screen.getByTestId("inline-marketplace-map")).toBeTruthy();
    fireEvent.press(screen.getByTestId("open-full-map-button"));
    expect(onOpenFullMap).toHaveBeenCalledTimes(1);
  });
});
