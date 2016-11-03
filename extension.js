const Main = imports.ui.main;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Shell = imports.gi.Shell;

let spot_count = 1;

function init() {
  let settings = Convenience.getSettings();
  let modeType = Shell.hasOwnProperty('ActionMode') ? Shell.ActionMode : Shell.KeyBindingMode;
  Main.wm.addKeybinding('tile-up', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, up);
  Main.wm.addKeybinding('tile-down', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, down);
  Main.wm.addKeybinding('tile-left', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, left);
  Main.wm.addKeybinding('tile-right', settings, Meta.KeyBindingFlags.NONE, modeType.NORMAL, right);
}

function up() { move('up') }
function down() { move('down') }
function left() { move('left') }
function right() { move('right') }

function move(direction) {
  spot_count = 1;
  let active_window = global.screen.get_display().get_focus_window();
  if (!active_window) return;

  let {x: x, y: y, width: w, height: h} = active_window.get_frame_rect();

  let x_tweak = 0;
  if (direction == 'left')  x_tweak = -10;
  if (direction == 'right') x_tweak = 10;

  let y_tweak = 0;
  if (direction == 'up') y_tweak = -10;
  if (direction == 'down') y_tweak = 10;

  let spots = get_spots();
  let spot = active_window.get_maximized() ?
             get_closest_spot(spots, center(x + x_tweak, y + y_tweak, h - y_tweak, w - x_tweak)) :
             get_closest_spot(spots, center(x, y, h, w));
  let norm = rect_norm(spot, {x: x, y: y, w: w, h: h});

  let next;
  if (norm > 20) {
    next = spot;
  } else if (direction == 'up' && !spot.u) {
    active_window.maximize(3);
    return;
  } else if (direction == 'down' && !spot.d) {
    active_window.minimize();
    return;
  } else {
    next = spot_direction(spot, direction);
  }

  if (!next) return;
  if (active_window.get_maximized) active_window.unmaximize(3);
  active_window.move_resize_frame(true, next.x, next.y, next.w, next.h);
  active_window.raise();
  let {x: new_x, y: new_y, width: new_w, height: new_h} = active_window.get_frame_rect();
  if (x != new_x || y != new_y || h != new_h || w != new_w) return;
  next = spot_direction(spot, direction);
  if (!next) return;
  active_window.move_resize_frame(true, next.x, next.y, next.w, next.h);
  active_window.raise();
}

function get_closest_spot(spots, point) {
  let closest_distance = Number.POSITIVE_INFINITY;
  let closest_spot;
  for (let i = 0; i < spots.length; i++) {
    let d = distance_points(point, spots[i].c);
    if (d < closest_distance) {
      closest_distance = d;
      closest_spot = spots[i];
    }
  }

  return closest_spot;
}


function get_spots() {
  let spots = [];
  let workspace = global.screen.get_active_workspace();
  let n = global.screen.get_n_monitors();
  for (let i = 0; i < n; i++) {
    let r = workspace.get_work_area_for_monitor(i);
    spots = spots.concat(split(r));
  }

  for (let i = 0; i < spots.length; i++) {
    set_directional_spots(spots[i], spots);
  }

  for (let i = 0; i < spots.length; i++) {
    dbg(spots[i]);
  }
  return spots;
}

function split(rect) {
  let {x: x, y: y, height: h, width: w} = rect;

  let spot1 = {label: spot_count++};
  let spot2 = {label: spot_count++};
  let spots = [spot1, spot2];
  if (w > h) { // landscape
    spot1.x = x;
    spot1.y = spot2.y = y;
    spot1.h = spot2.h = h;
    spot1.w = parseInt(w / 2);
    spot2.x = x + spot1.w;
    spot2.w = w - spot1.w;
  } else { // portrait
    spot1.x = spot2.x = x;
    spot1.y = y;
    spot1.h = parseInt(h / 2);
    spot1.w = spot2.w = w;
    spot2.y = y + spot1.h;
    spot2.h = h - spot1.h;
  }

  spot1.c = center(spot1.x, spot1.y, spot1.h, spot1.w);
  spot2.c = center(spot2.x, spot2.y, spot2.h, spot2.w);

  return spots;
}

function dbg(spot) {
  global.log('spot #' + spot.label);
  global.log('x:' + spot.x + ' y:' + spot.y + ' h:' + spot.h + ' w:' + spot.w + ' c:' +
             JSON.stringify(spot.c));
  let dir = "";
  if (spot.u) dir += ' up:' + spot.u.label;
  if (spot.d) dir += ' down:' + spot.d.label;
  if (spot.l) dir += ' left:' + spot.l.label;
  if (spot.r) dir += ' right:' + spot.r.label;
  global.log(dir);
}


function set_directional_spots(spot, all) {
  let closest = {
    up: {distance: Number.POSITIVE_INFINITY},
    down: {distance: Number.POSITIVE_INFINITY},
    left: {distance: Number.POSITIVE_INFINITY},
    right: {distance: Number.POSITIVE_INFINITY}
  };

  for (let i = 0; i < all.length; i++) {
    let other = all[i];
    if (spot == other) continue;

    let direction = Math.atan2(other.c.y - spot.c.y, other.c.x - spot.c.x) + Math.PI;
    let distance = distance_points(spot.c, other.c);
    let debugs = ""
    debugs +=
        'direction from ' + spot.label + ' to ' + other.label + ': ' + (direction * 180 / Math.PI);
    debugs += ' distance: ' + distance;

    if (direction < Math.PI / 4 || direction >= 7 / 4 * Math.PI) {
      debugs += ' LEFT';
      if (distance < closest.left.distance) {
        debugs += ' *SELECTED*';
        closest.left.spot = other;
        closest.left.distance = distance;
      }
    } else if (direction < 3 / 4 * Math.PI) {
      debugs += ' UP';
      if (distance < closest.up.distance) {
        debugs += ' *SELECTED*';
        closest.up.spot = other;
        closest.up.distance = distance;
      }
    } else if (direction < 5 / 4 * Math.PI) {
      debugs += ' RIGHT';
      if (distance < closest.right.distance) {
        debugs += ' *SELECTED*';
        closest.right.spot = other;
        closest.right.distance = distance;
      }
    } else {
      debugs += ' DOWN';
      if (distance < closest.down.distance) {
        debugs += ' *SELECTED*';
        closest.down.spot = other;
        closest.down.distance = distance;
      }
    }

    global.log(debugs);
  }

  spot.u = closest.up.spot;
  spot.d = closest.down.spot;
  spot.l = closest.left.spot;
  spot.r = closest.right.spot;
}

function spot_direction(spot, direction) {
  switch (direction) {
    case 'up':
      return spot.u;
    case 'down':
      return spot.d;
    case 'left':
      return spot.l;
    case 'right':
      return spot.r;
  }

  return undefined;
}

function center(x, y, h, w) {
  return {x: x + w / 2, y: y + h / 2};
}

function distance_points(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function rect_norm(rect_one, rect_two) {
  return Math.sqrt(
      Math.pow(rect_one.x - rect_two.x, 2) +
      Math.pow(rect_one.y - rect_two.y, 2) +
      Math.pow(rect_one.h - rect_two.h, 2) +
      Math.pow(rect_one.w - rect_two.w, 2)
  );
}

function enable() { }

function disable() { }