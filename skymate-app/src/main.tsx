// Early WebSocket patch for visibility (optional - comment out if not needed)
import "./earlyPatch";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import SkymateTabletUI from "./components/ui/SkymateTabletUI";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/ui" element={<SkymateTabletUI />} />
			</Routes>
		</BrowserRouter>
	</React.StrictMode>
);
