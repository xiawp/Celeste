// Celeste использует BlendFunction.Min/Max (накопление света, «вырез» блума). WebGL2 такие уравнения поддерживает,
// но KNI-Blazor не умеет их транслировать и бросает ArgumentException (ConcreteBlendState.ToGLBlendEquationMode).
// Обход: tools/semfix.py заменяет Min/Max на BlendFunction.Subtract (в игре не используется), а здесь, на уровне
// WebGL, «Subtract» превращается в настоящие MIN/MAX. Различитель — коэффициент источника:
//   Blend.One  -> MAX,   Blend.Zero -> MIN   (для MIN/MAX коэффициенты в GL игнорируются).
// KNI применяет уравнение и коэффициенты отдельными кешируемыми вызовами, поэтому эффективное уравнение
// пересчитывается при любом из них.
(function () {
  var SUBTRACT = 0x800A, MIN = 0x8007, MAX = 0x8008, ZERO = 0;
  function patch(proto) {
    if (!proto || proto.__celesteBlendPatched) return;
    proto.__celesteBlendPatched = true;
    var eqSep = proto.blendEquationSeparate, fnSep = proto.blendFuncSeparate;
    function st(c) { return c.__bs || (c.__bs = { er: 0x8006, ea: 0x8006, sr: 1, sa: 1 }); }
    function mapEq(e, src) { return e === SUBTRACT ? (src === ZERO ? MIN : MAX) : e; }
    function apply(c) { var s = st(c); eqSep.call(c, mapEq(s.er, s.sr), mapEq(s.ea, s.sa)); }
    proto.blendEquationSeparate = function (r, a) { var s = st(this); s.er = r; s.ea = a; apply(this); };
    proto.blendEquation = function (m) { proto.blendEquationSeparate.call(this, m, m); };
    proto.blendFuncSeparate = function (sr, dr, sa, da) { var s = st(this); s.sr = sr; s.sa = sa; fnSep.call(this, sr, dr, sa, da); apply(this); };
    proto.blendFunc = function (a, b) { proto.blendFuncSeparate.call(this, a, b, a, b); };
  }
  patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
})();
