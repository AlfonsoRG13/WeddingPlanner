type ErrorBannerProps = {
  message: string;
};

function ErrorBanner({ message }: ErrorBannerProps) {
  return <div className="error-banner" role="alert">{message}</div>;
}

export default ErrorBanner;
