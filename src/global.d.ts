interface Window {
    PushManager: {
        subscribeToPush: () => Promise<boolean>;
        checkSubscriptionStatus: () => Promise<boolean>;
        unsubscribeFromPush: () => Promise<boolean>;
    }
}