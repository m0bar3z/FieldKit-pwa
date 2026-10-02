import InstallPrompt from "@/components/InstallPrompt";
import PushNotificationManager from "@/components/PushNotificationManager";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between gap-12 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <section
          aria-label="Notifications and app installation"
          className="flex w-full flex-col gap-6 text-left"
        >
          <PushNotificationManager />
          <InstallPrompt />
        </section>
      </main>
    </div>
  );
}
