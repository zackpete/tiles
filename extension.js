const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Shell = imports.gi.Shell;

function init() {
  let settings = Convenience.getSettings();
  let modeType = Shell.hasOwnProperty('ActionMode') ? Shell.ActionMode : Shell.KeyBindingMode;
  Main.wm.addKeybinding('tile-up', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, up);
  Main.wm.addKeybinding('tile-down', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, down);
  Main.wm.addKeybinding('tile-left', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, left);
  Main.wm.addKeybinding('tile-right', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, right);
}

function up() { move(function (s) { return s.u; }) }
function down() { move(function (s) { return s.d; }) }
function left() { move(function (s) { return s.l; }) }
function right() { move(function (s) { return s.r; }) }

function move(movement) {
  let spots = get_spots();
  let active_window = global.screen.get_display().get_focus_window();
  if (!active_window) return;
  let {x: x, y: y, width: w, height: h} = active_window.get_frame_rect();
  let {spot: spot, distance: d} = get_closest_spot(spots, center(x, y, h, w));
  if (d <= 8 || active_window.get_maximized()) {
    // global.log('moving: x:' + spot.x + ' y:' + spot.y + ' h:' + spot.h + ' w:' + spot.w);
    let to_move = movement(spot);
    if (to_move) {
      active_window.unmaximize(3);
      active_window.move_resize_frame(true, to_move.x, to_move.y, to_move.w, to_move.h);
    } else {
      active_window.maximize(3);
    }
  } else {
    active_window.unmaximize(3);
    active_window.move_resize_frame(true, spot.x, spot.y, spot.w, spot.h);
  }
}

function get_closest_spot(spots, point) {
  let closest_distance = Number.POSITIVE_INFINITY;
  let closest_spot = undefined;
  for (let i = 0; i < spots.length; i++) {
    let d = distance(point, spots[i].c);
    if (d < closest_distance) {
      closest_distance = d;
      closest_spot = spots[i];
    }
  }

  return {distance: closest_distance, spot: closest_spot};
}

function get_spots() {
  let spots = [];
  let workspace = global.screen.get_active_workspace();

  let n = global.screen.get_n_monitors();
  let dimensions = [];
  for (let i = 0; i < n; i++) {
    let r = workspace.get_work_area_for_monitor(i);
    // global.log('loading: x:' + r.x + ' y:' + r.y + ' h:' + r.height + ' w:' + r.width);
    dimensions.push(r);
  }

  // Sort so they are left to right
  dimensions.sort(function (a, b) {
    return a.x - b.x;
  });

  let last_spot_top = undefined;
  let last_spot_bottom = undefined;
  for (let i = 0; i < n; i++) {
    let x = dimensions[i].x;
    let y = dimensions[i].y;
    let h = dimensions[i].height;
    let w = dimensions[i].width;

    let spot1 = {};
    let spot2 = {};
    if (w > h) { // landscape
      spot1.x = x;
      spot1.y = spot2.y = y;
      spot1.h = spot2.h = h;
      spot1.w = parseInt(w / 2);
      spot2.x = x + spot1.w;
      spot2.w = w - spot1.w;

      spot1.r = spot2;
      spot1.l = last_spot_top;
      spot2.l = spot1;

      if (last_spot_top) {
        last_spot_top.r = spot1;
      }

      if (last_spot_bottom) {
        last_spot_bottom.r = spot1;
      }

      last_spot_top = spot2;
      last_spot_bottom = spot2;
    } else { // portrait
      spot1.x = spot2.x = x;
      spot1.y = y;
      spot1.h = parseInt(h / 2);
      spot1.w = spot2.w = w;
      spot2.y = y + spot1.h;
      spot2.h = h - spot1.h;

      spot1.d = spot2;
      spot1.l = last_spot_top;
      spot2.u = spot1;
      spot2.l = last_spot_bottom;

      if (last_spot_top) {
        last_spot_top.r = spot1;
      }

      if (last_spot_bottom) {
        last_spot_bottom.r = spot2;
      }

      last_spot_top = spot1;
      last_spot_bottom = spot2;
    }

    spot1.c = center(spot1.x, spot1.y, spot1.h, spot1.w);
    spot2.c = center(spot2.x, spot2.y, spot2.h, spot2.w);

    spots.push(spot1);
    spots.push(spot2);
  }

  return spots;
}

function center(x, y, h, w) {
  return {x: x + w / 2, y: y + h / 2};
}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function enable() { }

function disable() { }