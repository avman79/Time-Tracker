/**
 * Floating Action Button (FAB).
 * On the Home page it resets/focuses the form.
 * On other pages it navigates back to Home.
 */

import { useNavigate, useLocation } from 'react-router-dom';

interface FABProps {
  /** Called when the FAB is pressed while on the home page */
  onHomePress?: () => void;
}

/**
 * A fixed-position circular button for the primary action.
 */
export function FAB({ onHomePress }: FABProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  function handleClick() {
    if (isHome) {
      onHomePress?.();
    } else {
      void navigate('/');
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="רשום שעות"
      className="fixed bottom-20 end-4 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform flex items-center justify-center text-2xl focus:outline-none focus:ring-4 focus:ring-blue-300"
    >
      +
    </button>
  );
}
