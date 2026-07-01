import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useState, useEffect } from 'react';

interface CardRotateProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  disableDrag?: boolean;
}

function CardRotate({ children, onSendToBack, sensitivity, disableDrag = false }: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      onSendToBack();
    } else {
      x.set(0);
      y.set(0);
    }
  }

  if (disableDrag) {
    return (
      <motion.div className="absolute inset-0 cursor-pointer" style={{ x: 0, y: 0 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

interface StackProps {
  cards: React.ReactNode[];
  sensitivity?: number;
  animationConfig?: { stiffness: number; damping: number };
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
}

export function Stack({
  cards,
  sensitivity = 150,
  animationConfig = { stiffness: 260, damping: 20 },
  mobileClickOnly = true,
  mobileBreakpoint = 768,
}: StackProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [mobileBreakpoint]);

  const disableDrag = mobileClickOnly && isMobile;

  const [stack, setStack] = useState<{ id: number; content: React.ReactNode }[]>(() =>
    cards.map((content, i) => ({ id: i, content }))
  );

  useEffect(() => {
    setStack(cards.map((content, i) => ({ id: i, content })));
  }, [cards]);

  const sendToBack = (id: number) => {
    setStack(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.id === id);
      const [card] = next.splice(idx, 1);
      next.unshift(card);
      return next;
    });
  };

  return (
    <div className="relative w-full h-full" style={{ perspective: 600 }}>
      {stack.map((card, index) => (
        <CardRotate
          key={card.id}
          onSendToBack={() => sendToBack(card.id)}
          sensitivity={sensitivity}
          disableDrag={disableDrag}
        >
          <motion.div
            className="rounded-2xl overflow-hidden w-full h-full"
            onClick={() => disableDrag && sendToBack(card.id)}
            animate={{
              rotateZ: (stack.length - index - 1) * 4,
              scale: 1 + index * 0.06 - stack.length * 0.06,
              transformOrigin: '90% 90%',
            }}
            initial={false}
            transition={{
              type: 'spring',
              stiffness: animationConfig.stiffness,
              damping: animationConfig.damping,
            }}
          >
            {card.content}
          </motion.div>
        </CardRotate>
      ))}
    </div>
  );
}
