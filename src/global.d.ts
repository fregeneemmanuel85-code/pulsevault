declare global {
  interface Window {
    FlutterwaveCheckout: {
      (config: any): void;
      close: () => void;
    };
  }
}

export {};
