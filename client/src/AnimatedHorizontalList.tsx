import React, { useRef, useState, useEffect, useCallback, ReactNode, UIEvent } from 'react';
import { motion, useInView } from 'motion/react';

interface AnimatedItemProps {
  children: ReactNode;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

function AnimatedItem({ children, index, containerRef, onMouseEnter, onClick }: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false, root: containerRef });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="shrink-0 cursor-pointer"
    >
      {children}
    </motion.div>
  );
}

interface AnimatedHorizontalListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  itemWidth?: number;
  gap?: number;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  selectedIndex?: number;
}

export function AnimatedHorizontalList<T>({
  items,
  renderItem,
  onItemSelect,
  itemWidth = 112,
  gap = 8,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  selectedIndex: externalSelected,
}: AnimatedHorizontalListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(externalSelected ?? -1);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [leftOpacity, setLeftOpacity] = useState(0);
  const [rightOpacity, setRightOpacity] = useState(1);
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target as HTMLDivElement;
    setLeftOpacity(Math.min(scrollLeft / 50, 1));
    const rightDistance = scrollWidth - (scrollLeft + clientWidth);
    setRightOpacity(scrollWidth <= clientWidth ? 0 : Math.min(rightDistance / 50, 1));
  };

  const handleItemClick = useCallback((item: T, index: number) => {
    setSelectedIndex(index);
    onItemSelect?.(item, index);
  }, [onItemSelect]);

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const item = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (item) {
      const margin = 50;
      const left = item.offsetLeft;
      const right = left + item.offsetWidth;
      if (left < container.scrollLeft + margin) {
        container.scrollTo({ left: left - margin, behavior: 'smooth' });
      } else if (right > container.scrollLeft + container.clientWidth - margin) {
        container.scrollTo({ left: right - container.clientWidth + margin, behavior: 'smooth' });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  useEffect(() => {
    if (!listRef.current) return;
    const { scrollWidth, clientWidth } = listRef.current;
    setRightOpacity(scrollWidth <= clientWidth ? 0 : 1);
  }, [items]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={listRef}
        className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1"
        style={{ gap }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            index={index}
            containerRef={listRef}
            onClick={() => handleItemClick(item, index)}
          >
            <div style={{ width: itemWidth }}>
              {renderItem(item, index)}
            </div>
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div
            className="absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-surface to-transparent pointer-events-none transition-opacity duration-300"
            style={{ opacity: leftOpacity }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-surface to-transparent pointer-events-none transition-opacity duration-300"
            style={{ opacity: rightOpacity }}
          />
        </>
      )}
    </div>
  );
}
