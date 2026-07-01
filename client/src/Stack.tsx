import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useState, useEffect } from 'react';

interface CardRotateProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  mobile?: boolean;
}

function CardRotate({ children, onSendToBack, sensitivity, mobile = false }: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const triggered = mobile
      ? Math.abs(info.offset.x) > sensitivity
      : Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity;

    if (triggered) {
      onSendToBack();
    } else {
      x.set(0);
      if (!mobile) y.set(0);
    }
  }

  return (
    <motion.div
      className={`absolute inset-0 ${mobile ? 'touch-pan-y' : 'cursor-grab'}`}
      style={{ x, y: mobile ? 0 : y, rotateX: mobile ? 0 : rotateX, rotateY }}
      drag={mobile ? 'x' : true}
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={mobile ? undefined : { cursor: 'grabbing' }}
      onTap={mobile ? onSendToBack : undefined}
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
  mobileBreakpoint?: number;
}

export function Stack({
  cards,
  sensitivity = 150,
  animationConfig = { stiffness: 260, damping: 20 },
  mobileBreakpoint = 768,
}: StackProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [mobileBreakpoint]);

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
          mobile={isMobile}
        >
          <motion.div
            className="rounded-2xl overflow-hidden w-full h-full"
            style={{ transformOrigin: '100% 90%' }}
            animate={{
              rotateZ: (stack.length - index - 1) * 4,
              scale: 1 + index * 0.06 - stack.length * 0.06,
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
