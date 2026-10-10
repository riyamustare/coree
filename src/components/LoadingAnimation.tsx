const LoadingAnimation = () => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      role="status"
      aria-label="Loading"
    >
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
};

export default LoadingAnimation;
