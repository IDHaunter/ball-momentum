import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { TriggerRenderer } from '../../src/rendering/TriggerRenderer';
import {
  CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY,
  CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY,
  CHECKPOINT_GLASS_TEXTURE_KEY,
  CHECKPOINT_GLOW_TEXTURE_KEY,
} from '../../src/rendering/CheckpointLightTextures';
import {
  GOAL_PORTAL_FIELD_TEXTURE_KEY,
  GOAL_PORTAL_FLOW_TEXTURE_KEY,
  GOAL_PORTAL_GLOW_TEXTURE_KEY,
} from '../../src/rendering/GoalPortalTextures';

class FakeDisplayObject {
  width = 0;
  height = 0;
  x = 0;
  y = 0;
  scaleX = 1;
  scaleY = 1;
  angle = 0;
  alpha = 1;
  fillAlpha = 1;
  depth = 0;
  destroyed = false;
  textureKey = '';
  readonly calls: string[] = [];
  readonly fillColors: number[] = [];
  readonly strokeWidths: number[] = [];
  readonly roundedRectArgs: number[][] = [];
  private readonly sourceWidth: number;
  private readonly sourceHeight: number;

  constructor(x = 0, y = 0, width = 0, height = 0, textureKey = '') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.textureKey = textureKey;
    this.sourceWidth = width > 0 ? width : 128;
    this.sourceHeight = height > 0 ? height : 128;
  }
  setDepth(value: number) { this.depth = value; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setScale(x: number, y = x) {
    this.scaleX = x;
    this.scaleY = y;
    this.width = this.sourceWidth * x;
    this.height = this.sourceHeight * y;
    return this;
  }
  setDisplaySize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.scaleX = width / this.sourceWidth;
    this.scaleY = height / this.sourceHeight;
    return this;
  }
  setTexture(key: string) { this.textureKey = key; return this; }
  setAngle(value: number) { this.angle = value; return this; }
  setAlpha(value: number) { this.alpha = value; return this; }
  setOrigin() { return this; }
  setStrokeStyle(width = 0) { this.strokeWidths.push(width); return this; }
  setFillStyle(color: number) { this.fillColors.push(color); return this; }
  clear() { return this; }
  fillStyle(color: number) { this.fillColors.push(color); return this; }
  lineStyle(width = 0) { this.strokeWidths.push(width); return this; }
  fillRect() { this.calls.push('fillRect'); return this; }
  strokeRect() { this.calls.push('strokeRect'); return this; }
  fillCircle() { this.calls.push('fillCircle'); return this; }
  fillEllipse() { this.calls.push('fillEllipse'); return this; }
  beginPath() { this.calls.push('beginPath'); return this; }
  moveTo() { this.calls.push('moveTo'); return this; }
  lineTo() { this.calls.push('lineTo'); return this; }
  closePath() { this.calls.push('closePath'); return this; }
  fillPath() { this.calls.push('fillPath'); return this; }
  strokePath() { this.calls.push('strokePath'); return this; }
  strokeEllipse() { this.calls.push('strokeEllipse'); return this; }
  strokeRoundedRect(...args: number[]) {
    this.calls.push('strokeRoundedRect');
    this.roundedRectArgs.push(args);
    return this;
  }
  lineBetween() { this.calls.push('lineBetween'); return this; }
  destroy() { this.destroyed = true; }
}

class FakeContainer extends FakeDisplayObject {
  constructor(x: number, y: number, readonly children: FakeDisplayObject[]) { super(x, y); }
  destroy(_fromScene?: boolean) { this.destroyed = true; }
}

function createScene() {
  const containers: FakeContainer[] = [];
  const graphics: FakeDisplayObject[] = [];
  const images: FakeDisplayObject[] = [];
  const rectangles: FakeDisplayObject[] = [];
  const tweenConfigs: Array<Record<string, unknown>> = [];
  const killedTweens: unknown[] = [];

  const scene = {
    textures: { exists: () => true },
    add: {
      graphics: () => {
        const object = new FakeDisplayObject();
        graphics.push(object);
        return object;
      },
      ellipse: (x: number, y: number, width: number, height: number) => new FakeDisplayObject(x, y, width, height),
      rectangle: (
        x: number,
        y: number,
        width: number,
        height: number,
        _fillColor?: number,
        fillAlpha = 1,
      ) => {
        const object = new FakeDisplayObject(x, y, width, height);
        object.fillAlpha = fillAlpha;
        rectangles.push(object);
        return object;
      },
      image: (x: number, y: number, textureKey: string) => {
        // Checkpoint image textures are 128x128 canvas textures. Keep the
        // fake object's scale semantics aligned with Phaser setDisplaySize.
        const object = new FakeDisplayObject(x, y, 128, 128, textureKey);
        images.push(object);
        return object;
      },
      container: (x: number, y: number, children: FakeDisplayObject[]) => {
        const container = new FakeContainer(x, y, children);
        containers.push(container);
        return container;
      },
      text: () => new FakeDisplayObject(),
    },
    tweens: {
      add: (config: Record<string, unknown>) => { tweenConfigs.push(config); return config; },
      killTweensOf: (target: unknown) => { killedTweens.push(target); },
    },
  };

  return {
    scene: scene as unknown as Phaser.Scene,
    containers,
    graphics,
    images,
    rectangles,
    tweenConfigs,
    killedTweens,
  };
}

const checkpoint = {
  id: 'cp-a', type: 'checkpoint' as const,
  x: 3000, y: 650, width: 50, height: 200,
  respawnX: 3050, respawnY: 832,
};


describe('TriggerRenderer goal portals', () => {
  const goal = {
    id: 'goal-a', type: 'goal' as const,
    x: 8400, y: 620, width: 110, height: 210,
  };

  it('renders the goal as a soft energy portal instead of a yellow trigger rectangle', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([goal]);

    expect(harness.containers).toHaveLength(1);
    expect(harness.containers[0].x).toBe(8455);
    expect(harness.containers[0].y).toBe(725);
    expect(harness.images.map((image) => image.textureKey)).toEqual([
      GOAL_PORTAL_GLOW_TEXTURE_KEY,
      GOAL_PORTAL_FIELD_TEXTURE_KEY,
      GOAL_PORTAL_FLOW_TEXTURE_KEY,
    ]);
    expect(harness.graphics[0].calls).not.toContain('fillRect');
    expect(harness.graphics[0].calls).not.toContain('strokeRect');

    const [glow, field, flow] = harness.containers[0].children;
    expect(glow.width).toBeCloseTo(goal.width * 1.52, 5);
    expect(glow.height).toBeCloseTo(goal.height * 1.52, 5);
    expect(field.width).toBe(goal.width);
    expect(field.height).toBe(goal.height);
    expect(flow.width).toBeCloseTo(goal.width * 0.94, 5);
    expect(flow.height).toBeCloseTo(goal.height * 0.94, 5);
  });

  it('preserves a square portal when the configured goal trigger is square', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    const squareGoal = { ...goal, id: 'goal-square', x: 1200, y: 300, width: 160, height: 160 };
    renderer.render([squareGoal]);

    const [glow, field, flow] = harness.containers[0].children;
    expect(harness.containers[0].x).toBe(1280);
    expect(harness.containers[0].y).toBe(380);
    expect(field.width).toBe(160);
    expect(field.height).toBe(160);
    expect(glow.width).toBeCloseTo(glow.height, 5);
    expect(flow.width).toBeCloseTo(flow.height, 5);
  });

  it('animates flowing energy waves and plays a restrained entry ripple when the ball reaches the goal', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([goal]);
    const portalChildren = harness.containers[0].children;
    const field = portalChildren[1];
    const waveGraphics = portalChildren[3];

    renderer.update(260);
    expect(waveGraphics.calls).toContain('lineTo');
    const idleAlpha = field.alpha;

    renderer.activateGoal('goal-a');
    renderer.update(180);

    expect(field.alpha).toBeGreaterThan(idleAlpha);
    expect(waveGraphics.calls).toContain('strokeRoundedRect');
    const [rippleX, rippleY, rippleWidth, rippleHeight] = waveGraphics.roundedRectArgs[0];
    expect(rippleWidth / rippleHeight).toBeCloseTo(goal.width / goal.height, 5);
    expect(rippleX).toBeLessThan(0);
    expect(rippleY).toBeLessThan(0);
    expect(waveGraphics.calls).not.toContain('strokeEllipse');
    expect(waveGraphics.calls).toContain('fillCircle');
  });

  it('keeps the portal static when reduced motion is enabled', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([goal]);
    renderer.setReducedMotion(true);
    renderer.activateGoal('goal-a');
    renderer.update(500);

    const [glow, field, flow, waves] = harness.containers[0].children;
    expect(glow.alpha).toBe(0.42);
    expect(field.alpha).toBe(0.82);
    expect(flow.y).toBe(0);
    expect(flow.angle).toBe(0);
    expect(waves.calls).not.toContain('strokeRoundedRect');
  });
});

describe('TriggerRenderer checkpoints', () => {
  it('renders a decorative lamp post at the trigger base without a physical-looking trigger rectangle', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);

    renderer.render([checkpoint]);

    expect(harness.containers).toHaveLength(1);
    expect(harness.containers[0].x).toBe(3025);
    expect(harness.containers[0].y).toBe(850);
    expect(harness.containers[0].children).toHaveLength(15);
    expect(harness.graphics[0].calls).not.toContain('fillRect');
    expect(harness.images.map((image) => image.textureKey)).toEqual([
      CHECKPOINT_GLOW_TEXTURE_KEY,
      CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY,
      CHECKPOINT_GLASS_TEXTURE_KEY,
    ]);
  });

  it('uses a slim metal stem and a small dormant flame inside a transparent glass lantern', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([checkpoint]);

    const children = harness.containers[0].children;
    const glow = children[1];
    const stemShadow = children[6];
    const stem = children[7];
    const flame = children[9];
    const glass = children[10];

    expect(glow.alpha).toBe(0);
    expect(stem.width).toBe(7);
    expect(stem.height).toBe(112);
    expect(stemShadow.width).toBe(9);
    expect(stemShadow.fillAlpha).toBe(0.2);
    expect(flame.textureKey).toBe(CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY);
    expect(flame.width).toBe(14);
    expect(flame.height).toBe(21);
    expect(flame.alpha).toBe(0.72);
    expect(glass.textureKey).toBe(CHECKPOINT_GLASS_TEXTURE_KEY);
    expect(glass.width).toBe(48);
    expect(glass.height).toBe(58);
  });

  it('lights a small flame inside the unchanged glass shell and gently animates the fire and glow', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([checkpoint]);
    renderer.setActiveCheckpoint('cp-a');

    const children = harness.containers[0].children;
    const glow = children[1];
    const flame = children[9];
    const glass = children[10];

    expect(glow.alpha).toBe(0.22);
    expect(flame.textureKey).toBe(CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY);
    expect(flame.width).toBe(14);
    expect(flame.height).toBe(21);
    expect(flame.alpha).toBe(1);
    expect(glass.textureKey).toBe(CHECKPOINT_GLASS_TEXTURE_KEY);
    expect(harness.tweenConfigs.some((config) => config.targets === glow && config.repeat === -1 && config.yoyo === true)).toBe(true);

    const ignitionTween = harness.tweenConfigs.find((config) => config.targets === flame && config.yoyo === true);
    expect(ignitionTween).toBeDefined();
    expect(ignitionTween?.scaleX).toBeCloseTo(flame.scaleX * 1.5, 6);
    expect(ignitionTween?.scaleY).toBeCloseTo(flame.scaleY * 1.5, 6);
    expect(ignitionTween?.duration).toBe(190);
    expect(ignitionTween?.repeat).toBeUndefined();

    // Once the one-shot ignition has returned to its baseline size, only a
    // few-percent sway is allowed for the ongoing flame animation.
    (ignitionTween?.onComplete as (() => void) | undefined)?.();
    const steadyFlameTween = harness.tweenConfigs.find((config) => config.targets === flame && config.repeat === -1);
    expect(steadyFlameTween).toBeDefined();
    expect(steadyFlameTween?.scaleX).toBeCloseTo(flame.scaleX * 1.025, 6);
    expect(steadyFlameTween?.scaleY).toBeCloseTo(flame.scaleY * 1.035, 6);
    expect((steadyFlameTween?.scaleX as number)).toBeLessThan(flame.scaleX * 1.06);
    expect((steadyFlameTween?.scaleY as number)).toBeLessThan(flame.scaleY * 1.06);
  });

  it('turns the previous lamp off when a later checkpoint becomes active', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([
      checkpoint,
      { ...checkpoint, id: 'cp-b', x: 3400, respawnX: 3450 },
    ]);

    const firstChildren = harness.containers[0].children;
    const firstGlow = firstChildren[1];
    const firstFlame = firstChildren[9];
    renderer.setActiveCheckpoint('cp-a');
    renderer.setActiveCheckpoint('cp-b');

    expect(firstGlow.alpha).toBe(0);
    expect(firstFlame.textureKey).toBe(CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY);
    expect(harness.killedTweens).toContain(firstGlow);
    expect(harness.containers[1].children[1].alpha).toBe(0.22);
  });

  it('keeps a steady lit flame and stable ambient glow when reduced motion is enabled', () => {
    const harness = createScene();
    const renderer = new TriggerRenderer(harness.scene);
    renderer.render([checkpoint]);
    renderer.setReducedMotion(true);
    const tweenCount = harness.tweenConfigs.length;

    renderer.setActiveCheckpoint('cp-a');

    const children = harness.containers[0].children;
    expect(children[1].alpha).toBe(0.28);
    expect(children[9].textureKey).toBe(CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY);
    expect(harness.tweenConfigs).toHaveLength(tweenCount);
  });
});
