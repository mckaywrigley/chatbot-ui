import React, { ReactNode } from "react";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import {
    ReactPlugin,
    withAITracking,
    AppInsightsContext,
} from "@microsoft/applicationinsights-react-js";

let reactPlugin = new ReactPlugin();
let appInsights = new ApplicationInsights({
    config: {
        connectionString: process.env.NEXT_PUBLIC_APP_INSIGHT,
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        enableAjaxPerfTracking: true,
        isBrowserLinkTrackingEnabled: true,
        extensions: [reactPlugin],
    },
});

appInsights.loadAppInsights();

interface AzureAppInsightsProps {
    children: ReactNode;
}

const AzureAppInsights = ({ children }: AzureAppInsightsProps) => {
    return (
        <AppInsightsContext.Provider value={reactPlugin}>
            {children}
        </AppInsightsContext.Provider>
    );
};

export default withAITracking(reactPlugin, AzureAppInsights);