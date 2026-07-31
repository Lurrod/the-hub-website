import { describe, it, expect } from "vitest";
import {
  CROP_ASPECT,
  CROP_OUTPUT,
  MAX_ZOOM,
  clampOffset,
  clampZoom,
  computeCropRect,
  coverScale,
  displayedSize,
  minZoom,
} from "@/lib/crop";

const FRAME = { width: 300, height: 300 };

describe("CROP_ASPECT / CROP_OUTPUT", () => {
  it("aligne le rapport du cadre sur la sortie du serveur", () => {
    expect(CROP_ASPECT.square).toBeCloseTo(CROP_OUTPUT.square.width / CROP_OUTPUT.square.height);
    expect(CROP_ASPECT.round).toBeCloseTo(CROP_OUTPUT.round.width / CROP_OUTPUT.round.height);
    expect(CROP_ASPECT.wide).toBeCloseTo(CROP_OUTPUT.wide.width / CROP_OUTPUT.wide.height);
  });
  it("garde la bannière à 1280x360, comme processAndStoreImage", () => {
    expect(CROP_OUTPUT.wide).toEqual({ width: 1280, height: 360 });
  });
});

describe("coverScale", () => {
  it("choisit le plus grand rapport pour couvrir le cadre", () => {
    // 600x300 dans 300x300 : il faut 1 sur la hauteur, 0,5 suffirait en largeur.
    expect(coverScale({ width: 600, height: 300 }, FRAME)).toBe(1);
  });
  it("retombe sur 1 si l'image n'a pas de dimensions", () => {
    expect(coverScale({ width: 0, height: 0 }, FRAME)).toBe(1);
  });
});

describe("minZoom", () => {
  it("permet de dézoomer jusqu'à voir l'image entière", () => {
    // 600x300 dans 300x300 : cover = 1, contain = 0,5 → zoom mini 0,5.
    expect(minZoom({ width: 600, height: 300 }, FRAME)).toBeCloseTo(0.5);
  });
  it("vaut 1 quand l'image a déjà le rapport du cadre", () => {
    expect(minZoom({ width: 900, height: 900 }, FRAME)).toBeCloseTo(1);
  });
});

describe("clampZoom", () => {
  it("borne en bas au zoom « image entière »", () => {
    expect(clampZoom(0.1, { width: 600, height: 300 }, FRAME)).toBeCloseTo(0.5);
  });
  it("borne en haut à MAX_ZOOM", () => {
    expect(clampZoom(99, { width: 600, height: 300 }, FRAME)).toBe(MAX_ZOOM);
  });
  it("laisse passer une valeur valide", () => {
    expect(clampZoom(2, { width: 600, height: 300 }, FRAME)).toBe(2);
  });
  it("neutralise NaN", () => {
    expect(clampZoom(Number.NaN, { width: 600, height: 300 }, FRAME)).toBe(1);
  });
});

describe("displayedSize", () => {
  it("applique cover puis le zoom", () => {
    expect(displayedSize({ width: 600, height: 300 }, FRAME, 2)).toEqual({
      width: 1200,
      height: 600,
    });
  });
});

describe("clampOffset", () => {
  const image = { width: 600, height: 300 };
  it("empêche de découvrir un bord au zoom cover", () => {
    // Affiché 600x300 dans 300x300 → marge de 150 px en x, 0 en y.
    expect(clampOffset({ x: 999, y: 999 }, image, FRAME, 1)).toEqual({ x: 150, y: 0 });
    expect(clampOffset({ x: -999, y: -999 }, image, FRAME, 1)).toEqual({ x: -150, y: 0 });
  });
  it("recentre quand l'image est plus petite que le cadre", () => {
    expect(clampOffset({ x: 40, y: 40 }, image, FRAME, 0.5)).toEqual({ x: 0, y: 0 });
  });
  it("laisse passer un décalage dans les marges", () => {
    expect(clampOffset({ x: 20, y: 0 }, image, FRAME, 1)).toEqual({ x: 20, y: 0 });
  });
});

describe("computeCropRect", () => {
  it("recadre au centre sans décalage ni zoom", () => {
    // 600x300 → cover 1 : on garde les 300 px centraux en largeur.
    expect(computeCropRect({ width: 600, height: 300 }, FRAME, 1, { x: 0, y: 0 })).toEqual({
      sx: 150,
      sy: 0,
      sWidth: 300,
      sHeight: 300,
    });
  });
  it("décale la fenêtre source à l'inverse du glissement", () => {
    // Glisser l'image vers la droite (+x) montre sa partie gauche.
    expect(computeCropRect({ width: 600, height: 300 }, FRAME, 1, { x: 100, y: 0 })).toEqual({
      sx: 50,
      sy: 0,
      sWidth: 300,
      sHeight: 300,
    });
  });
  it("réduit la fenêtre source quand on zoome", () => {
    const r = computeCropRect({ width: 600, height: 300 }, FRAME, 2, { x: 0, y: 0 });
    expect(r.sWidth).toBeCloseTo(150);
    expect(r.sHeight).toBeCloseTo(150);
    expect(r.sx).toBeCloseTo(225);
    expect(r.sy).toBeCloseTo(75);
  });
  it("déborde de l'image quand on dézoome (marges transparentes)", () => {
    const r = computeCropRect({ width: 600, height: 300 }, FRAME, 0.5, { x: 0, y: 0 });
    expect(r.sWidth).toBeCloseTo(600);
    expect(r.sHeight).toBeCloseTo(600);
    expect(r.sx).toBeCloseTo(0);
    expect(r.sy).toBeCloseTo(-150);
  });
  it("reste défini si le cadre n'est pas encore mesuré", () => {
    const r = computeCropRect({ width: 600, height: 300 }, { width: 0, height: 0 }, 1, {
      x: 0,
      y: 0,
    });
    expect(Number.isFinite(r.sx)).toBe(true);
    expect(Number.isFinite(r.sWidth)).toBe(true);
  });
});
