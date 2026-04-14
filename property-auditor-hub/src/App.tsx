import { TransparencyPage } from "./features/public/pages/TransparencyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page - portal selection */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auditor routes */}
          <Route path="/auditor/login" element={<AuditorLoginPage />} />
          <Route path="/auditor" element={<AuditorLayout />}>
            <Route path="inbox" element={<AuditorInboxPage />} />
            <Route path="review/:submissionId" element={<AuditorReviewPage />} />
            <Route path="reports" element={<AuditorReportsPage />} />
            <Route path="settings" element={<AuditorSettingsPage />} />
          </Route>

          {/* Registrar routes */}
          <Route path="/registrar/login" element={<RegistrarLoginPage />} />
          <Route path="/registrar" element={<RegistrarLayout />}>
            <Route path="inbox" element={<RegistrarInboxPage />} />
            <Route path="review/:submissionId" element={<RegistrarReviewPage />} />
            <Route path="reports" element={<RegistrarReportsPage />} />
            <Route path="settings" element={<RegistrarSettingsPage />} />
          </Route>

          {/* Public Transparency routes */}
          <Route path="/public" element={<TransparencyPage />} />
          <Route path="/public/verify" element={<TransparencyPage />} />
          <Route path="/public/parcel/:parcelId" element={<TransparencyPage />} />
          <Route path="/public/tx/:txHash" element={<TransparencyPage />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
