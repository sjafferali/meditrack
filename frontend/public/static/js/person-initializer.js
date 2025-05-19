// Person initialization module
(function() {
  // This will ensure the person selector initializes correctly
  window.addEventListener('load', function() {
    console.log('Person initializer activated');
    
    // Force reload if stuck on loading screen for too long
    const LOADING_TIMEOUT = 2000; // 2 seconds
    setTimeout(function() {
      const loadingElements = document.querySelectorAll('.text-center.p-4');
      if (loadingElements.length > 0) {
        const loadingText = loadingElements[0].textContent;
        if (loadingText && loadingText.includes('Loading medications')) {
          console.log('Detected stuck loading state, refreshing person selector');
          // Find and click the Manage People button to force initialization
          const buttons = document.querySelectorAll('button');
          for (const button of buttons) {
            if (button.textContent && button.textContent.includes('Manage People')) {
              button.click();
              console.log('Triggered person manager');
              
              // Auto-close it after a slight delay
              setTimeout(function() {
                const closeBtns = document.querySelectorAll('button');
                for (const btn of closeBtns) {
                  if (btn.textContent && btn.textContent === 'Cancel') {
                    btn.click();
                    console.log('Auto-closed person manager');
                    break;
                  }
                }
              }, 500);
              
              break;
            }
          }
        }
      }
    }, LOADING_TIMEOUT);
  });
})();
