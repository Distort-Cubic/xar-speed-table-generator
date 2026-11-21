
(() => {
  // ==================================================
  // GLOBAL SETTINGS
  // ==================================================

  const GLOBAL = {
    width: 800,
    height: 500,
    maxTicks: 250,
    maxSpeed: 150,

    initialSpeed: 0,
    ticksPerSecond: 25,
    speedMod: 0.15,

    tickGridStep: 25,
    speedGridStep: 25
  };

  // ==================================================
  // CONFIGURATIONS
  // Each configuration defines its own color.
  // ==================================================

  const CONFIGURATIONS = [
    {
      name: "Rocket - No Impulses",
      color: "#e53935",
      drag: 0.98,
      acceleration: 0.2,
      impulses: []
    },
    {
      name: "Rocket - Projectile",
      color: "#1e88e5",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 0.05, interval: 25 }
      ]
    },
    {
      name: "Rocket - Multiple Sources",
      color: "#43a047",
      drag: 0.98,
      acceleration: 0.2,
      impulses: [
        { magnitude: 0.05, interval: 25 },
        { magnitude: 0.10, interval: 50 }
      ]
    }
  ];

  const NS = "http://www.w3.org/2000/svg";

  // ==================================================
  // VALIDATION
  // ==================================================

  if (
    GLOBAL.width <= 0 ||
    GLOBAL.height <= 0 ||
    GLOBAL.maxTicks <= 0 ||
    GLOBAL.maxSpeed <= 0 ||
    GLOBAL.ticksPerSecond <= 0
  ) {
    throw new Error("Graph dimensions and scale values must be positive.");
  }

  if (CONFIGURATIONS.length > 20) {
    throw new Error(
      "Too many configurations. CSS state generation creates 2^N states."
    );
  }

  CONFIGURATIONS.forEach(config => {
    if (
      config.drag < 0 ||
      config.drag > 1 ||
      !Number.isFinite(config.acceleration)
    ) {
      throw new Error(`Invalid physics parameters in ${config.name}`);
    }

    if (
      typeof config.color !== "string" ||
      !config.color.trim()
    ) {
      throw new Error(`Missing color in ${config.name}`);
    }

    if (!Array.isArray(config.impulses)) {
      throw new Error(`Impulses must be an array in ${config.name}`);
    }

    config.impulses.forEach(impulse => {
      if (
        impulse.interval <= 0 ||
        impulse.magnitude < 0 ||
        !Number.isFinite(impulse.interval) ||
        !Number.isFinite(impulse.magnitude)
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

  const x = tick =>
    (tick / GLOBAL.maxTicks) * GLOBAL.width;

  const y = speed =>
    GLOBAL.height -
    (speed / GLOBAL.maxSpeed) * GLOBAL.height;

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

  // ==================================================
  // CSS STATE SWITCHING
  // ==================================================

  const configCount = CONFIGURATIONS.length;
  const stateCount = 1 << configCount;

  function stateId(mask) {
    return "s" +
      mask.toString(2).padStart(configCount, "0");
  }

  const style = createSvgElement("style");

  let css = `
    .state {
      display: none;
    }

    /* Default state: every configuration visible */
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
  // BACKGROUND GRAPH
  // This group is never affected by state switching.
  // ==================================================

  const backgroundGroup = createSvgElement("g", {
    id: "background-graph"
  });

  // Horizontal grid lines and speed labels.
  for (
    let speed = 0;
    speed <= GLOBAL.maxSpeed;
    speed += GLOBAL.speedGridStep
  ) {
    const yy = y(speed);

    backgroundGroup.appendChild(
      createSvgElement("line", {
        x1: 0,
        y1: yy,
        x2: GLOBAL.width,
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

  // Vertical grid lines and tick labels.
  for (
    let tick = 0;
    tick <= GLOBAL.maxTicks;
    tick += GLOBAL.tickGridStep
  ) {
    const xx = x(tick);

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

  // Axes.
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
      x2: GLOBAL.width,
      y2: GLOBAL.height,
      stroke: "#222",
      "stroke-width": 2
    })
  );

  addSvgText(backgroundGroup, "Ticks", {
    x: GLOBAL.width / 2,
    y: GLOBAL.height - 20,
    fill: "#222",
    "font-size": 13,
    "text-anchor": "middle"
  });

  addSvgText(backgroundGroup, "Speed (blocks/second)", {
    x: 15,
    y: 15,
    fill: "#222",
    "font-size": 13
  });

  svg.appendChild(backgroundGroup);

  // ==================================================
  // GENERATE CONFIGURATION DATA
  // ==================================================

  const allData = CONFIGURATIONS.map(config => {
    const effectiveAcceleration =
      config.acceleration * GLOBAL.speedMod;

    const data = [];
    let speed = GLOBAL.initialSpeed;

    for (let tick = 0; tick <= GLOBAL.maxTicks; tick++) {
      data.push({
        tick,
        speed: speed * GLOBAL.ticksPerSecond
      });

      if (tick === GLOBAL.maxTicks) break;

      // Impulses occur on updates producing ticks:
      // 1, 1 + interval, 1 + 2*interval, ...
      const nextTick = tick + 1;

      let impulse = 0;

      config.impulses.forEach(source => {
        if ((nextTick - 1) % source.interval === 0) {
          impulse += source.magnitude;
        }
      });

      // Impulse is added before drag.
      // Acceleration is added after drag.
      speed =
        (speed + impulse) * config.drag +
        effectiveAcceleration;
    }

    return data;
  });

  // ==================================================
  // CREATE ONE GROUP PER CONFIGURATION
  // ==================================================

  const configurationGroups = CONFIGURATIONS.map(
    (config, index) => {
      const group = createSvgElement("g", {
        id: `config-${index + 1}`,
        "data-config-name": config.name
      });

      const data = allData[index];

      // Line path.
      const pathData = data
        .map((point, pointIndex) => {
          const command = pointIndex === 0 ? "M" : "L";
          return `${command} ${x(point.tick)} ${y(point.speed)}`;
        })
        .join(" ");

      group.appendChild(
        createSvgElement("path", {
          d: pathData,
          fill: "none",
          stroke: config.color,
          "stroke-width": 2
        })
      );

      // Data point circles.
      data.forEach(point => {
        group.appendChild(
          createSvgElement("circle", {
            cx: x(point.tick),
            cy: y(point.speed),
            r: 2,
            fill: config.color
          })
        );
      });

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
  // GENERATE EVERY VISIBILITY STATE
  // ==================================================

  for (let mask = 0; mask < stateCount; mask++) {
    const stateGroup = createSvgElement("g", {
      class: `state ${stateId(mask)}`,
      "data-state": stateId(mask)
    });

    // Add visible configuration groups.
    configurationGroups.forEach((config, index) => {
      const visible = (mask & (1 << index)) !== 0;

      if (visible) {
        stateGroup.appendChild(config.group.cloneNode(true));
      }
    });

    // --------------------------------------------------
    // LEGEND
    // Each linked legend entry uses its configuration's
    // exact color, whether visible or hidden.
    // --------------------------------------------------

    const legendGroup = createSvgElement("g", {
      class: "legend"
    });

    const legendStartX = GLOBAL.width - 10;
    const legendStartY = 20;
    const legendSpacing = 18;

    CONFIGURATIONS.forEach((config, index) => {
      const visible = (mask & (1 << index)) !== 0;

      // Clicking toggles only this configuration.
      const nextMask = mask ^ (1 << index);

      const link = createSvgElement("a", {
        href: `#${stateId(nextMask)}`,
        "data-toggle-config": index + 1
      });

      const yPosition = legendStartY + index * legendSpacing;

      // Color indicator.
      const indicator = createSvgElement("line", {
        x1: legendStartX - 160,
        y1: yPosition - 4,
        x2: legendStartX - 145,
        y2: yPosition - 4,
        stroke: config.color,
        "stroke-width": 3,
        opacity: visible ? 1 : 0.25
      });

      legendGroup.appendChild(indicator);

      // Linked legend text.
      const text = createSvgElement("text", {
        x: legendStartX,
        y: yPosition,
        fill: config.color,
        opacity: visible ? 1 : 0.35,
        "font-size": 12,
        "text-anchor": "end",
        style: "cursor:pointer;text-decoration:underline"
      });

      text.textContent =
        `${visible ? "●" : "○"} ${config.name}`;

      link.appendChild(text);

      // Make the color indicator part of the clickable link too.
      // Both the text and indicator retain config.color.
      link.insertBefore(indicator, text);

      legendGroup.appendChild(link);
    });

    stateGroup.appendChild(legendGroup);
    svg.appendChild(stateGroup);
  }

  // ==================================================
  // MEDIAWIKI TABLE
  // Always contains every configuration.
  // ==================================================

  const wikiLines = [
    '{| class="wikitable"',
    "! Tick",
    ...CONFIGURATIONS.map(config => `! ${config.name}`)
  ];

  for (let tick = 0; tick <= GLOBAL.maxTicks; tick++) {
    wikiLines.push("|-");

    wikiLines.push(
      `| ${tick}`,
      ...allData.map(data => `| ${data[tick].speed.toFixed(3)}`)
    );
  }

  wikiLines.push("|}");

  // ==================================================
  // HTML OUTPUT
  // ==================================================

  const container = document.createElement("div");

  container.id = "velocity-graph-output";
  container.style.fontFamily = "sans-serif";
  container.style.margin = "12px 0";

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
