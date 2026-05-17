import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LoadingAnimation = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#FAF7F2] z-50">
      <div className="w-12 h-12">
        <DotLottieReact
          src="https://lottie.host/83995e80-755a-4818-9fd1-b24763ccca9e/69WYSTeTY9.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
};

export default LoadingAnimation;
