// Inspiration: https://twitter.com/jmtrivedi/status/1521190109617410048
// Draggable list code taken from here: https://codesandbox.io/s/github/pmndrs/react-spring/tree/master/demo/src/sandboxes/draggable-list?file=/src/App.tsx:877-1033

import { DefaultLayout } from "@/default-layout";
import { noop } from "@/shared/utils";
import { clamp } from "@/uff/clamp";
import { moveArrayItem } from "@/uff/moveArrayItem";
import { useSprings, a } from "@react-spring/web";
import type { useSpring } from "@react-spring/web";
import { raf } from "@react-spring/rafz";
import { useDrag } from "@use-gesture/react";
import { useRef } from "react";
import { to } from "@/uff/to";
import { radiansToDegrees } from "@/uff/radiansToDegrees";

const items = [
  "🥝 Groceries",
  "🍿 Netflix Watchlist",
  "👉 Follow-ups",
  "⏲️ Reminders",
  "🌟 Design Inspirations",
  "🧢 < 10 mins tasks",
  "📨 Work stuff",
  "🦦 Past time",
];

/*
  TODO
  - fix somrero name in filenames and in code
  - flick anim (project/deceleration rate)
  - better sombero https://twitter.com/_chenglou/status/1521230129019588608?s=20&t=2Jk69IYFKO6DH_sZf62-QA
*/

const ITEM_HEIGHT = 24 + /* padding */ 12 * 2;

export const FluidSomberoList = () => {
  const { bind, springs } = useDraggable(items);

  return (
    <DefaultLayout className="pb-6 grid place-items-center bg-sky-50 cursor-touch">
      <div className="w-[400px] h-[650px] border rounded-md bg-white drop-shadow-xl py-3 px-4 overflow-hidden">
        <h1 className="mb-1 text-2xl">To-Do List</h1>
        <p className="mb-2 text-gray-600 text-sm">
          Drag and drop an item to see a ripple (sombero) effect.
        </p>
        <ul className="relative">
          {springs.map(({ zIndex, y, scale }, i) => {
            return (
              <a.li
                {...bind(i)}
                key={i}
                // add backdrop opacity
                className="py-3 select-none absolute touch-none"
                style={{
                  zIndex,
                  y,
                  scale,
                }}
                children={items[i]}
              />
            );
          })}
        </ul>
      </div>
    </DefaultLayout>
  );
};

const updateSpring =
  (
    order: number[],
    active = false,
    originalIndex = 0,
    curIndex = 0,
    y = 0,
    last = false,
    done: (originalIndex: number) => void = noop
  ) =>
  (index: number, x: any): Parameters<typeof useSpring>[0] => {
    return active && index === originalIndex
      ? {
          y: curIndex * ITEM_HEIGHT + y,
          scale: 1.1,
          zIndex: 1,
          immediate: (key) => key === "y" || key === "zIndex",
        }
      : !active && last && index === originalIndex
      ? {
          y: order.indexOf(index) * ITEM_HEIGHT,
          scale: 1,
          zIndex: 0,
          immediate: false,
          onRest: () => {
            done(index);
          },
        }
      : {
          y: order.indexOf(index) * ITEM_HEIGHT,
          scale: 1,
          zIndex: 0,
          immediate: false,
        };
  };

const useDraggable = (items: string[]) => {
  const order = useRef(items.map((_, index) => index)); // Store indicies as a local ref, this represents the item order
  const [springs, api] = useSprings(items.length, updateSpring(order.current)); // Create springs, each corresponds to an item, controlling its transform, scale, etc.

  // sombrero
  const done = (originOriginalIndex: number) => {
    const startTime = raf.now(); // this exists, otherwise would've used performance.now()

    let dampingCoeff = 1;
    raf(() => {
      const now = raf.now();
      const originCurIndex = order.current.indexOf(originOriginalIndex);

      api.start((orginalIndex) => {
        const curIndex = order.current.indexOf(orginalIndex);
        const distance = Math.abs(curIndex - originCurIndex) * ITEM_HEIGHT;
        // const f = Math.sqrt(distance ** 2 + Math.round(now - startTime) ** 2);
        const f = distance + Math.round(now - startTime);
        // ref.
        // https://twitter.com/jmtrivedi/status/1521233999330373632?s=20&t=elNJcQgto8sorSgTQ_FGdg
        // https://octave.sourceforge.io/octave/function/sombrero.html (target
        // dec. 11th 2022 or earlier on wayback machine if it isn't available)
        const intensity = Math.sin(f) / f;

        const scale = to(
          clamp(Math.abs(intensity), 1 / 10 ** 7, 1),
          [1 / 10 ** 7, 1],
          [0.94, 1.04]
        );

        // intensity *= 100;
        // intensity *= dampingCoeff;

        if (curIndex === 0) {
          console.log("dbg:", radiansToDegrees(Math.sin(f)) / f);
          // console.log("dbg:", "00x", scale);
        }
        if (curIndex === 4) {
          // console.log("dbg:", "44x", scale);
        }

        return {
          scale,
          // immediate: true,
        };
      });

      // TODO it increases th value when multiplied somehow
      dampingCoeff *= 0.9 ** 2;
      if (now - startTime < 400) {
        return true;
      } else {
        api.start(() => ({ scale: 1 }));
      }
    });
  };

  const bind = useDrag(({ args: [originalIndex], active, movement: [, y], last }) => {
    const curIndex = order.current.indexOf(originalIndex);
    const curRow = clamp(
      Math.round((curIndex * ITEM_HEIGHT + y) / ITEM_HEIGHT),
      0,
      items.length - 1
    );
    const newOrder = moveArrayItem(order.current, curIndex, curRow);
    api.start(updateSpring(newOrder, active, originalIndex, curIndex, y, last, done)); // Feed springs new style data, they'll animate the view without causing a single render
    if (!active) order.current = newOrder;
  });

  return { springs, bind };
};
