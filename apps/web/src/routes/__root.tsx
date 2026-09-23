import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { IngestionShell } from "@/components/IngestionShell";
import { ShortcutProvider } from "@/components/ShortcutProvider";
import { Toaster } from "@/components/ui/sonner.js";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IngestionEventsProvider } from "@/lib/ingestion-events-context.js";

import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <IngestionEventsProvider>
        <TooltipProvider>
          <ShortcutProvider>
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <Header />
              <main className="flex-1">
                <IngestionShell>
                  <Outlet />
                </IngestionShell>
              </main>
              <Footer />
              <Toaster position="bottom-center" richColors closeButton />
            </div>
          </ShortcutProvider>
        </TooltipProvider>
      </IngestionEventsProvider>
    </QueryClientProvider>
  );
}
