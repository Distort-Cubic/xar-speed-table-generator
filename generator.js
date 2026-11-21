
(() => {
  // ==================================================
  // GLOBAL SETTINGS
  // ==================================================

  const GLOBAL = {
    width: 1700,
    height: 500,

    panelWidth: 800,
    panelGap: 100,

    maxTicks: 250,
    maxSpeed: 150,
    maxPosition: 1500,
    minPosition: 0.01,

    initialSpeed: 0,
    initialPosition: 0,

    ticksPerSecond: 25,
    speedMod: 0.15,

    tickGridStep: 25,
    speedGridStep: 25
  };

  // ==================================================
  // CONFIGURATIONS
  //
  // Each configuration owns its color.
  //
  // Impulse properties:
  //   magnitude: added to speed before drag
  //   interval:  repeat interval in ticks
  //   offset:    first update tick; defaults to 0
  //
  // Example:
  // { magnitude: 0.05, interval: 25, offset: 5 }
  // applies at update ticks 5, 30, 55, 80...
  // ==================================================

  const CONFIGURATIONS = [
    {
      name: "Rocket - No Impulses",
      color: "#888888",
      drag: 0.98,
      acceleration: 0.2,
      impulses: []
    },
    {
      name: "Rocket - Secondary Rockets (Slow)",
      color: "#aaaa33",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 0.05, interval: 25 }
      ]
    },
    {
      name: "Rocket - Secondary Rockets (Fast)",
      color: "#aaaa33",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 0.05, interval: 5 }
      ]
    },
    {
      name: "Rocket - Rail Primary Backwards (Slow)",
      color: "#1e1ee5",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 0.2, interval: 50 }
      ]
    },
    {
      name: "Rocket - Rail Primary Backwards (Fast)",
      color: "#1e1ee5",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 0.2, interval: 7 }
      ]
    },
    {
      name: "Rocket - Nuke Primary Backwards",
      color: "#444444",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 1.5, interval: 25 }
      ]
    },
    {
      name: "Rocket - Nuclear Propulsion",
      color: "#445566",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 2, interval: 25 }
      ]
    },
    {
      name: "Dark Hole Drive - Nulcear Propulsion",
      color: "#442266",
      drag: 0.99,
      acceleration: 0.2,
      impulses: [
        { magnitude: 2, interval: 25 }
      ]
    },
    {
      name: "Quasar - Nuclear Propulsion",
      color: "#331166",
      drag: 0.995,
      acceleration: 0.2,
      impulses: [
        { magnitude: 2, interval: 25 }
      ]
    }
  ];

  const NS = "http://www.w3.org/2000/svg";

  const POSITION_X = GLOBAL.panelWidth + GLOBAL.panelGap;

  // ==================================================
  // VALIDATION
  // ==================================================

  if (
    GLOBAL.width <= 0 ||
    GLOBAL.height <= 0 ||
    GLOBAL.maxTicks <= 0 ||
    GLOBAL.maxSpeed <= 0 ||
    GLOBAL.maxPosition <= 0 ||
    GLOBAL.minPosition <= 0 ||
    GLOBAL.ticksPerSecond <= 0
  ) {
    throw new Error("Graph dimensions and scale values must be positive.");
  }

  if (GLOBAL.maxPosition <= GLOBAL.minPosition) {
    throw new Error("maxPosition must exceed minPosition.");
  }

  if (CONFIGURATIONS.length > 20) {
    throw new Error(
      "Too many configurations. CSS state generation creates 2^N states."
    );
  }

  CONFIGURATIONS.forEach(config => {
    if (
      !config.name ||
      !config.color ||
      !Number.isFinite(config.drag) ||
      config.drag < 0 ||
      config.drag > 1 ||
      !Number.isFinite(config.acceleration)
    ) {
      throw new Error(`Invalid configuration: ${config.name}`);
    }

    if (!Array.isArray(config.impulses)) {
      throw new Error(`Impulses must be an array in ${config.name}`);
    }

    config.impulses.forEach(impulse => {
      const offset = impulse.offset ?? 0;

      if (
        !Number.isFinite(impulse.interval) ||
        !Number.isInteger(impulse.interval) ||
        impulse.interval <= 0 ||
        !Number.isFinite(impulse.magnitude) ||
        impulse.magnitude < 0 ||
        !Number.isInteger(offset) ||
        offset < 0
      ) {
        throw new Error(`Invalid impulse in ${config.name}`);
      }
    });
  });

  // ==================================================
  // SVG HELPERS
  // ==================================================

  function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(NS, tag);

    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    return element;
  }

  function addSvgText(parent, text, attributes = {}) {
    const element = createSvgElement("text", attributes);
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  // ==================================================
  // GRAPH COORDINATES
  // ==================================================

  // Velocity plot: linear x and y.

  const velocityX = tick =>
    (tick / GLOBAL.maxTicks) * GLOBAL.panelWidth;

  const velocityY = speed =>
    GLOBAL.height -
    (speed / GLOBAL.maxSpeed) * GLOBAL.height;

  // Position plot: logarithmic x and y.
  //
  // x starts at tick 1 because log(0) is undefined.
  // y starts at minPosition because log(0) is undefined.

  const positionX = tick =>
    POSITION_X +
    (
      Math.log(tick) /
      Math.log(GLOBAL.maxTicks)
    ) * GLOBAL.panelWidth;

  const positionY = position =>
    GLOBAL.height -
    (
      (
        Math.log(position) - Math.log(GLOBAL.minPosition)
      ) /
      (
        Math.log(GLOBAL.maxPosition) -
        Math.log(GLOBAL.minPosition)
      )
    ) * GLOBAL.height;

  // ==================================================
  // SVG ROOT
  // ==================================================

  const svg = createSvgElement("svg", {
    xmlns: NS,
    width: GLOBAL.width,
    height: GLOBAL.height,
    viewBox: `0 0 ${GLOBAL.width} ${GLOBAL.height}`
  });

  svg.style.display = "block";
  svg.style.border = "1px solid #888";
  svg.style.background = "#fff";
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";

  // ==================================================
  // CSS STATE SWITCHING
  // ==================================================

  const configCount = CONFIGURATIONS.length;
  const stateCount = 1 << configCount;

  function stateId(mask) {
    return "s" + mask.toString(2).padStart(configCount, "0");
  }

  const style = createSvgElement("style");

  let css = `
    .state {
      display: none;
    }

    /* Default: all configurations visible */
    svg:not(:has(:target)) .${stateId(stateCount - 1)} {
      display: inline;
    }
  `;

  for (let mask = 0; mask < stateCount; mask++) {
    css += `
      #${stateId(mask)}:target ~ .${stateId(mask)} {
        display: inline;
      }
    `;
  }

  style.textContent = css;
  svg.appendChild(style);

  // ==================================================
  // BACKGROUND: VELOCITY PLOT
  // ==================================================

  const backgroundGroup = createSvgElement("g", {
    id: "background-graph"
  });

  // Horizontal velocity grid lines.

  for (
    let speed = 0;
    speed <= GLOBAL.maxSpeed;
    speed += GLOBAL.speedGridStep
  ) {
    const yy = velocityY(speed);

    backgroundGroup.appendChild(
      createSvgElement("line", {
        x1: 0,
        y1: yy,
        x2: GLOBAL.panelWidth,
        y2: yy,
        stroke: "#ddd",
        "stroke-width": 1
      })
    );

    addSvgText(backgroundGroup, speed, {
      x: 5,
      y: yy - 4,
      fill: "#555",
      "font-size": 11
    });
  }

  // Vertical velocity grid lines.

  for (
    let tick = 0;
    tick <= GLOBAL.maxTicks;
    tick += GLOBAL.tickGridStep
  ) {
    const xx = velocityX(tick);

    backgroundGroup.appendChild(
      createSvgElement("line", {
        x1: xx,
        y1: 0,
        x2: xx,
        y2: GLOBAL.height,
        stroke: "#ddd",
        "stroke-width": 1
      })
    );

    addSvgText(backgroundGroup, tick, {
      x: xx,
      y: GLOBAL.height - 5,
      fill: "#555",
      "font-size": 11,
      "text-anchor": "middle"
    });
  }

  // Velocity axes.

  backgroundGroup.appendChild(
    createSvgElement("line", {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: GLOBAL.height,
      stroke: "#222",
      "stroke-width": 2
    })
  );

  backgroundGroup.appendChild(
    createSvgElement("line", {
      x1: 0,
      y1: GLOBAL.height,
      x2: GLOBAL.panelWidth,
      y2: GLOBAL.height,
      stroke: "#222",
      "stroke-width": 2
    })
  );

  addSvgText(backgroundGroup, "Velocity (blocks/second)", {
    x: 15,
    y: 15,
    fill: "#222",
    "font-size": 13
  });

  addSvgText(backgroundGroup, "Ticks", {
    x: GLOBAL.panelWidth / 2,
    y: GLOBAL.height - 20,
    fill: "#222",
    "font-size": 13,
    "text-anchor": "middle"
  });

  // ==================================================
  // BACKGROUND: LOG-LOG POSITION PLOT
  // ==================================================

  const positionBackground = createSvgElement("g", {
    id: "position-background"
  });

  // Position y-axis grid lines.
  // Logarithmic values at powers of ten.

const positionGridValues = [
  1, 8, 16, 32, 48, 64,
  128, 256, 512, 768, 1024, 1500
];

  positionGridValues.forEach(value => {
    if (
      value < GLOBAL.minPosition ||
      value > GLOBAL.maxPosition
    ) return;

    const yy = positionY(value);

    positionBackground.appendChild(
      createSvgElement("line", {
        x1: POSITION_X,
        y1: yy,
        x2: GLOBAL.width,
        y2: yy,
        stroke: "#ddd",
        "stroke-width": 1
      })
    );

    addSvgText(positionBackground, value, {
      x: POSITION_X + 5,
      y: yy - 4,
      fill: "#555",
      "font-size": 11
    });
  });

  // Add the upper limit as a labeled grid line if it
  // is not already a power of ten.

  if (
    !positionGridValues.includes(GLOBAL.maxPosition)
  ) {
    const yy = positionY(GLOBAL.maxPosition);

    positionBackground.appendChild(
      createSvgElement("line", {
        x1: POSITION_X,
        y1: yy,
        x2: GLOBAL.width,
        y2: yy,
        stroke: "#aaa",
        "stroke-width": 1
      })
    );

    addSvgText(positionBackground, GLOBAL.maxPosition, {
      x: POSITION_X + 5,
      y: yy + 12,
      fill: "#555",
      "font-size": 11
    });
  }

  // Logarithmic x-axis grid lines.
  // Include useful intermediate ticks.

  const positionTickValues = [
    1, 2, 5, 10, 20, 50, 100, 200, 250
  ];

  positionTickValues.forEach(tick => {
    if (tick > GLOBAL.maxTicks) return;

    const xx = positionX(tick);

    positionBackground.appendChild(
      createSvgElement("line", {
        x1: xx,
        y1: 0,
        x2: xx,
        y2: GLOBAL.height,
        stroke: "#ddd",
        "stroke-width": 1
      })
    );

    addSvgText(positionBackground, tick, {
      x: xx,
      y: GLOBAL.height - 5,
      fill: "#555",
      "font-size": 11,
      "text-anchor": "middle"
    });
  });

  // Position axes.

  positionBackground.appendChild(
    createSvgElement("line", {
      x1: POSITION_X,
      y1: 0,
      x2: POSITION_X,
      y2: GLOBAL.height,
      stroke: "#222",
      "stroke-width": 2
    })
  );

  positionBackground.appendChild(
    createSvgElement("line", {
      x1: POSITION_X,
      y1: GLOBAL.height,
      x2: GLOBAL.width,
      y2: GLOBAL.height,
      stroke: "#222",
      "stroke-width": 2
    })
  );

  addSvgText(positionBackground, "Position (blocks)", {
    x: POSITION_X + 15,
    y: 15,
    fill: "#222",
    "font-size": 13
  });

  addSvgText(positionBackground, "Ticks (log scale)", {
    x: POSITION_X + GLOBAL.panelWidth / 2,
    y: GLOBAL.height - 20,
    fill: "#222",
    "font-size": 13,
    "text-anchor": "middle"
  });

  backgroundGroup.appendChild(positionBackground);
  svg.appendChild(backgroundGroup);

  // ==================================================
  // GENERATE CONFIGURATION DATA
  //
  // speed is stored in blocks/tick internally.
  // Displayed velocity is blocks/second.
  //
  // position is accumulated in blocks.
  //
  // At update tick t:
  //   1. Find impulses scheduled for t.
  //   2. Add impulses to speed.
  //   3. Apply drag.
  //   4. Add acceleration.
  //   5. Store speed at tick t+1.
  //   6. Advance position by the new speed.
  // ==================================================

  const allData = CONFIGURATIONS.map(config => {
    const effectiveAcceleration =
      config.acceleration * GLOBAL.speedMod;

    const data = [];

    let speed = GLOBAL.initialSpeed;
    let position = GLOBAL.initialPosition;

    // Initial state: tick 0.
    data.push({
      tick: 0,
      speed: speed * GLOBAL.ticksPerSecond,
      position
    });

    for (
      let updateTick = 0;
      updateTick < GLOBAL.maxTicks;
      updateTick++
    ) {
      let impulseTotal = 0;

      config.impulses.forEach(source => {
        const offset = source.offset ?? 0;

        if (
          updateTick >= offset &&
          (updateTick - offset) % source.interval === 0
        ) {
          impulseTotal += source.magnitude;
        }
      });

      // Impulse before drag; acceleration after drag.
      speed =
        (speed + impulseTotal) * config.drag +
        effectiveAcceleration;

      // Advance position by the new speed.
      position += speed;

      const nextTick = updateTick + 1;

      data.push({
        tick: nextTick,
        speed: speed * GLOBAL.ticksPerSecond,
        position
      });
    }

    return data;
  });

  // ==================================================
  // CREATE ONE GROUP PER CONFIGURATION
  //
  // Each group contains BOTH plots.
  // Hiding a configuration hides both curves.
  // ==================================================

  const configurationGroups = CONFIGURATIONS.map(
    (config, index) => {
      const group = createSvgElement("g", {
        id: `config-${index + 1}`,
        "data-config-name": config.name
      });

      const data = allData[index];

      // ----------------------------------------------
      // VELOCITY CURVE
      // ----------------------------------------------

      const velocityGroup = createSvgElement("g", {
        class: "velocity-series"
      });

      const velocityPath = data
        .map((point, pointIndex) => {
          const command = pointIndex === 0 ? "M" : "L";

          return (
            `${command} ${velocityX(point.tick)} ` +
            `${velocityY(point.speed)}`
          );
        })
        .join(" ");

      velocityGroup.appendChild(
        createSvgElement("path", {
          d: velocityPath,
          fill: "none",
          stroke: config.color,
          "stroke-width": 2
        })
      );

      data.forEach(point => {
        velocityGroup.appendChild(
          createSvgElement("circle", {
            cx: velocityX(point.tick),
            cy: velocityY(point.speed),
            r: 2,
            fill: config.color
          })
        );
      });

      group.appendChild(velocityGroup);

      // ----------------------------------------------
      // POSITION CURVE
      // ----------------------------------------------

      const positionGroup = createSvgElement("g", {
        class: "position-series"
      });

      // Tick 0 and non-positive positions cannot be
      // represented on logarithmic axes.

      const positivePositions = data.filter(point =>
        point.tick > 0 &&
        point.position > 0
      );

      if (positivePositions.length > 0) {
        const positionPath = positivePositions
          .map((point, pointIndex) => {
            const command = pointIndex === 0 ? "M" : "L";

            return (
              `${command} ${positionX(point.tick)} ` +
              `${positionY(point.position)}`
            );
          })
          .join(" ");

        positionGroup.appendChild(
          createSvgElement("path", {
            d: positionPath,
            fill: "none",
            stroke: config.color,
            "stroke-width": 2
          })
        );

        positivePositions.forEach(point => {
          positionGroup.appendChild(
            createSvgElement("circle", {
              cx: positionX(point.tick),
              cy: positionY(point.position),
              r: 2,
              fill: config.color
            })
          );
        });
      }

      group.appendChild(positionGroup);

      return {
        name: config.name,
        color: config.color,
        group
      };
    }
  );

  // ==================================================
  // STATE ANCHORS
  // ==================================================

  const anchors = document.createDocumentFragment();

  for (let mask = 0; mask < stateCount; mask++) {
    anchors.appendChild(
      createSvgElement("g", {
        id: stateId(mask)
      })
    );
  }

  svg.appendChild(anchors);

  // ==================================================
  // GENERATE VISIBILITY STATES
  //
  // Each state has:
  //   - the selected configuration groups
  //   - one legend
  //
  // The legend uses colored bullet text only.
  // ==================================================

  for (let mask = 0; mask < stateCount; mask++) {
    const stateGroup = createSvgElement("g", {
      class: `state ${stateId(mask)}`,
      "data-state": stateId(mask)
    });

    // Add visible configurations.
    configurationGroups.forEach((config, index) => {
      const visible = (mask & (1 << index)) !== 0;

      if (visible) {
        stateGroup.appendChild(config.group.cloneNode(true));
      }
    });

    // One legend shared by both plots.
    const legendGroup = createSvgElement("g", {
      class: "legend"
    });

    const legendStartX = GLOBAL.panelWidth - 10;
    const legendStartY = 25;
    const legendSpacing = 18;

    CONFIGURATIONS.forEach((config, index) => {
      const visible = (mask & (1 << index)) !== 0;
      const nextMask = mask ^ (1 << index);

      const link = createSvgElement("a", {
        href: `#${stateId(nextMask)}`,
        "data-toggle-config": index + 1,
        style: "cursor:pointer"
      });

      const text = createSvgElement("text", {
        x: legendStartX,
        y: legendStartY + index * legendSpacing,
        fill: config.color,
        opacity: visible ? 1 : 0.35,
        "font-size": 12,
        "text-anchor": "end",
        style: "cursor:pointer;text-decoration:underline"
      });

      text.textContent =
        `${visible ? "●" : "○"} ${config.name}`;

      link.appendChild(text);
      legendGroup.appendChild(link);
    });

    stateGroup.appendChild(legendGroup);
    svg.appendChild(stateGroup);
  }

  // ==================================================
  // MEDIAWIKI TABLE
  //
  // Each configuration has two columns:
  //   - Velocity in blocks/second
  //   - Position in blocks
  //
  // Headers use the same color as the graph curves.
  // All configurations are always included.
  // ==================================================

  const wikiLines = [
    '{| class="wikitable"',
    "! Tick"
  ];

  CONFIGURATIONS.forEach(config => {
    wikiLines.push(
      `! style="color:${config.color}" | ${config.name} - Velocity`,
      `! style="color:${config.color}" | ${config.name} - Position`
    );
  });

  for (let tick = 0; tick <= GLOBAL.maxTicks; tick++) {
    wikiLines.push("|-");

    wikiLines.push(`| ${tick}`);

    allData.forEach(data => {
      wikiLines.push(
        `| ${data[tick].speed.toFixed(3)}`,
        `| ${data[tick].position.toFixed(3)}`
      );
    });
  }

  wikiLines.push("|}");

  // ==================================================
  // HTML OUTPUT
  // ==================================================

  const container = document.createElement("div");

  container.id = "velocity-graph-output";
  container.style.fontFamily = "sans-serif";
  container.style.margin = "12px 0";
  container.style.maxWidth = "100%";
  container.style.overflowX = "auto";

  const tableLabel = document.createElement("div");
  tableLabel.textContent = "MediaWiki table";
  tableLabel.style.fontWeight = "bold";
  tableLabel.style.margin = "12px 0 5px";

  const textarea = document.createElement("textarea");
  textarea.value = wikiLines.join("\n");
  textarea.readOnly = true;
  textarea.spellcheck = false;
  textarea.style.width = "100%";
  textarea.style.height = "300px";
  textarea.style.boxSizing = "border-box";
  textarea.style.fontFamily = "monospace";
  textarea.style.whiteSpace = "pre";
  textarea.style.resize = "vertical";

  const copyButton = document.createElement("button");
  copyButton.textContent = "Copy MediaWiki table";
  copyButton.style.margin = "5px 0";

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      copyButton.textContent = "Copied";
    } catch {
      textarea.focus();
      textarea.select();
      copyButton.textContent = "Select and copy manually";
    }
  });

  container.appendChild(svg);
  container.appendChild(tableLabel);
  container.appendChild(textarea);
  container.appendChild(copyButton);

  // Replace previous output.
  const previous = document.getElementById(container.id);
  if (previous) previous.remove();

  document.body.appendChild(container);
})();
