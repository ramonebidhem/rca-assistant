import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage.js";
import { CategoryPage } from "./pages/CategoryPage.js";
import { RootCausesPage } from "./pages/RootCausesPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { LoginPage } from "./admin/LoginPage.js";
import { AdminLayout } from "./admin/AdminLayout.js";
import { RequireAuth } from "./admin/RequireAuth.js";
import { DashboardPage } from "./admin/DashboardPage.js";
import { ContentCategoriesPage } from "./admin/ContentCategoriesPage.js";
import { ContentCategoryPage } from "./admin/ContentCategoryPage.js";
import { ContentFailureTypePage } from "./admin/ContentFailureTypePage.js";
import { SuggestionsPage } from "./admin/SuggestionsPage.js";
import { SettingsPage } from "./admin/SettingsPage.js";

export function App() {
    return (
        <Routes>
            {/* Viewer (no login) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/categories/:id" element={<CategoryPage />} />
            <Route path="/failure-types/:id" element={<RootCausesPage />} />

            {/* Admin */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
                path="/admin"
                element={
                    <RequireAuth>
                        <AdminLayout />
                    </RequireAuth>
                }
            >
                <Route index element={<DashboardPage />} />
                <Route path="content" element={<ContentCategoriesPage />} />
                <Route
                    path="content/categories/:id"
                    element={<ContentCategoryPage />}
                />
                <Route
                    path="content/failure-types/:id"
                    element={<ContentFailureTypePage />}
                />
                <Route path="suggestions" element={<SuggestionsPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
