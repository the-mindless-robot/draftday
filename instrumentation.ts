export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (typeof globalThis.DOMMatrix !== "undefined") return

  class DOMPoint {
    x: number
    y: number
    z: number
    w: number
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x
      this.y = y
      this.z = z
      this.w = w
    }
    static fromPoint(p: Partial<DOMPoint> = {}) {
      return new DOMPoint(p.x ?? 0, p.y ?? 0, p.z ?? 0, p.w ?? 1)
    }
    matrixTransform(m: DOMMatrix) {
      return new DOMPoint(
        this.x * m.m11 + this.y * m.m21 + this.z * m.m31 + this.w * m.m41,
        this.x * m.m12 + this.y * m.m22 + this.z * m.m32 + this.w * m.m42,
        this.x * m.m13 + this.y * m.m23 + this.z * m.m33 + this.w * m.m43,
        this.x * m.m14 + this.y * m.m24 + this.z * m.m34 + this.w * m.m44,
      )
    }
  }

  class DOMMatrix {
    m11: number; m12: number; m13: number; m14: number
    m21: number; m22: number; m23: number; m24: number
    m31: number; m32: number; m33: number; m34: number
    m41: number; m42: number; m43: number; m44: number

    constructor(init?: string | number[]) {
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1
      if (Array.isArray(init)) {
        if (init.length === 6) {
          this.m11 = init[0]; this.m12 = init[1]
          this.m21 = init[2]; this.m22 = init[3]
          this.m41 = init[4]; this.m42 = init[5]
        } else if (init.length === 16) {
          [this.m11, this.m12, this.m13, this.m14,
           this.m21, this.m22, this.m23, this.m24,
           this.m31, this.m32, this.m33, this.m34,
           this.m41, this.m42, this.m43, this.m44] = init
        }
      }
    }

    get a() { return this.m11 }
    get b() { return this.m12 }
    get c() { return this.m21 }
    get d() { return this.m22 }
    get e() { return this.m41 }
    get f() { return this.m42 }
    get is2D() {
      return this.m13 === 0 && this.m14 === 0 && this.m23 === 0 && this.m24 === 0
        && this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0
        && this.m43 === 0 && this.m44 === 1
    }
    get isIdentity() {
      return this.m11 === 1 && this.m12 === 0 && this.m13 === 0 && this.m14 === 0
        && this.m21 === 0 && this.m22 === 1 && this.m23 === 0 && this.m24 === 0
        && this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0
        && this.m41 === 0 && this.m42 === 0 && this.m43 === 0 && this.m44 === 1
    }

    static fromMatrix(m: Partial<DOMMatrix>) {
      return new DOMMatrix([
        m.m11 ?? 1, m.m12 ?? 0, m.m13 ?? 0, m.m14 ?? 0,
        m.m21 ?? 0, m.m22 ?? 1, m.m23 ?? 0, m.m24 ?? 0,
        m.m31 ?? 0, m.m32 ?? 0, m.m33 ?? 1, m.m34 ?? 0,
        m.m41 ?? 0, m.m42 ?? 0, m.m43 ?? 0, m.m44 ?? 1,
      ])
    }

    multiply(other: DOMMatrix): DOMMatrix {
      const a = this, b = other
      return new DOMMatrix([
        a.m11*b.m11 + a.m12*b.m21 + a.m13*b.m31 + a.m14*b.m41,
        a.m11*b.m12 + a.m12*b.m22 + a.m13*b.m32 + a.m14*b.m42,
        a.m11*b.m13 + a.m12*b.m23 + a.m13*b.m33 + a.m14*b.m43,
        a.m11*b.m14 + a.m12*b.m24 + a.m13*b.m34 + a.m14*b.m44,
        a.m21*b.m11 + a.m22*b.m21 + a.m23*b.m31 + a.m24*b.m41,
        a.m21*b.m12 + a.m22*b.m22 + a.m23*b.m32 + a.m24*b.m42,
        a.m21*b.m13 + a.m22*b.m23 + a.m23*b.m33 + a.m24*b.m43,
        a.m21*b.m14 + a.m22*b.m24 + a.m23*b.m34 + a.m24*b.m44,
        a.m31*b.m11 + a.m32*b.m21 + a.m33*b.m31 + a.m34*b.m41,
        a.m31*b.m12 + a.m32*b.m22 + a.m33*b.m32 + a.m34*b.m42,
        a.m31*b.m13 + a.m32*b.m23 + a.m33*b.m33 + a.m34*b.m43,
        a.m31*b.m14 + a.m32*b.m24 + a.m33*b.m34 + a.m34*b.m44,
        a.m41*b.m11 + a.m42*b.m21 + a.m43*b.m31 + a.m44*b.m41,
        a.m41*b.m12 + a.m42*b.m22 + a.m43*b.m32 + a.m44*b.m42,
        a.m41*b.m13 + a.m42*b.m23 + a.m43*b.m33 + a.m44*b.m43,
        a.m41*b.m14 + a.m42*b.m24 + a.m43*b.m34 + a.m44*b.m44,
      ])
    }

    inverse(): DOMMatrix {
      const m = this
      const n11=m.m11, n12=m.m12, n13=m.m13, n14=m.m14
      const n21=m.m21, n22=m.m22, n23=m.m23, n24=m.m24
      const n31=m.m31, n32=m.m32, n33=m.m33, n34=m.m34
      const n41=m.m41, n42=m.m42, n43=m.m43, n44=m.m44

      const t11 = n23*n34*n42 - n24*n33*n42 + n24*n32*n43 - n22*n34*n43 - n23*n32*n44 + n22*n33*n44
      const t12 = n14*n33*n42 - n13*n34*n42 - n14*n32*n43 + n12*n34*n43 + n13*n32*n44 - n12*n33*n44
      const t13 = n13*n24*n42 - n14*n23*n42 + n14*n22*n43 - n12*n24*n43 - n13*n22*n44 + n12*n23*n44
      const t14 = n14*n23*n32 - n13*n24*n32 - n14*n22*n33 + n12*n24*n33 + n13*n22*n34 - n12*n23*n34

      const det = n11*t11 + n21*t12 + n31*t13 + n41*t14
      if (det === 0) return new DOMMatrix()

      const d = 1 / det
      return new DOMMatrix([
        t11*d,
        (n24*n33*n41 - n23*n34*n41 - n24*n31*n43 + n21*n34*n43 + n23*n31*n44 - n21*n33*n44)*d,
        (n22*n34*n41 - n24*n32*n41 + n24*n31*n42 - n21*n34*n42 - n22*n31*n44 + n21*n32*n44)*d,
        (n23*n32*n41 - n22*n33*n41 - n23*n31*n42 + n21*n33*n42 + n22*n31*n43 - n21*n32*n43)*d,
        t12*d,
        (n13*n34*n41 - n14*n33*n41 + n14*n31*n43 - n11*n34*n43 - n13*n31*n44 + n11*n33*n44)*d,
        (n14*n32*n41 - n12*n34*n41 - n14*n31*n42 + n11*n34*n42 + n12*n31*n44 - n11*n32*n44)*d,
        (n12*n33*n41 - n13*n32*n41 + n13*n31*n42 - n11*n33*n42 - n12*n31*n43 + n11*n32*n43)*d,
        t13*d,
        (n14*n23*n41 - n13*n24*n41 - n14*n21*n43 + n11*n24*n43 + n13*n21*n44 - n11*n23*n44)*d,
        (n12*n24*n41 - n14*n22*n41 + n14*n21*n42 - n11*n24*n42 - n12*n21*n44 + n11*n22*n44)*d,
        (n13*n22*n41 - n12*n23*n41 - n13*n21*n42 + n11*n23*n42 + n12*n21*n43 - n11*n22*n43)*d,
        t14*d,
        (n13*n24*n31 - n14*n23*n31 + n14*n21*n33 - n11*n24*n33 - n13*n21*n34 + n11*n23*n34)*d,
        (n14*n22*n31 - n12*n24*n31 - n14*n21*n32 + n11*n24*n32 + n12*n21*n34 - n11*n22*n34)*d,
        (n12*n23*n31 - n13*n22*n31 + n13*n21*n32 - n11*n23*n32 - n12*n21*n33 + n11*n22*n33)*d,
      ])
    }

    transformPoint(p: { x?: number; y?: number; z?: number; w?: number }) {
      const x = p.x ?? 0, y = p.y ?? 0, z = p.z ?? 0, w = p.w ?? 1
      return new DOMPoint(
        x*this.m11 + y*this.m21 + z*this.m31 + w*this.m41,
        x*this.m12 + y*this.m22 + z*this.m32 + w*this.m42,
        x*this.m13 + y*this.m23 + z*this.m33 + w*this.m43,
        x*this.m14 + y*this.m24 + z*this.m34 + w*this.m44,
      )
    }

    translate(tx = 0, ty = 0, tz = 0): DOMMatrix {
      return this.multiply(new DOMMatrix([1,0,0,0, 0,1,0,0, 0,0,1,0, tx,ty,tz,1]))
    }

    scale(sx = 1, sy = sx, sz = 1, ox = 0, oy = 0, oz = 0): DOMMatrix {
      return this.translate(ox, oy, oz)
        .multiply(new DOMMatrix([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, 0,0,0,1]))
        .translate(-ox, -oy, -oz)
    }

    rotate(rx = 0, ry?: number, rz?: number): DOMMatrix {
      if (ry === undefined && rz === undefined) { rz = rx; rx = 0; ry = 0 }
      const toRad = Math.PI / 180
      let m: DOMMatrix = new DOMMatrix()
      if (rz) {
        const c = Math.cos(rz * toRad), s = Math.sin(rz * toRad)
        m = m.multiply(new DOMMatrix([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]))
      }
      if (ry) {
        const c = Math.cos(ry * toRad), s = Math.sin(ry * toRad)
        m = m.multiply(new DOMMatrix([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]))
      }
      if (rx) {
        const c = Math.cos(rx * toRad), s = Math.sin(rx * toRad)
        m = m.multiply(new DOMMatrix([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]))
      }
      return this.multiply(m)
    }

    rotateAxisAngle(x = 0, y = 0, z = 0, angle = 0): DOMMatrix {
      const rad = (angle * Math.PI) / 180
      const c = Math.cos(rad), s = Math.sin(rad), t = 1 - c
      const len = Math.sqrt(x*x + y*y + z*z)
      if (len === 0) return this
      x /= len; y /= len; z /= len
      return this.multiply(new DOMMatrix([
        t*x*x+c,   t*x*y+s*z, t*x*z-s*y, 0,
        t*x*y-s*z, t*y*y+c,   t*y*z+s*x, 0,
        t*x*z+s*y, t*y*z-s*x, t*z*z+c,   0,
        0,         0,         0,          1,
      ]))
    }

    skewX(angle: number): DOMMatrix {
      return this.multiply(new DOMMatrix([1,0,0,0, Math.tan(angle*Math.PI/180),1,0,0, 0,0,1,0, 0,0,0,1]))
    }

    skewY(angle: number): DOMMatrix {
      return this.multiply(new DOMMatrix([1,Math.tan(angle*Math.PI/180),0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]))
    }

    toFloat32Array() {
      return new Float32Array([this.m11,this.m12,this.m13,this.m14,this.m21,this.m22,this.m23,this.m24,this.m31,this.m32,this.m33,this.m34,this.m41,this.m42,this.m43,this.m44])
    }

    toFloat64Array() {
      return new Float64Array([this.m11,this.m12,this.m13,this.m14,this.m21,this.m22,this.m23,this.m24,this.m31,this.m32,this.m33,this.m34,this.m41,this.m42,this.m43,this.m44])
    }

    toString() {
      return this.is2D
        ? `matrix(${this.m11},${this.m12},${this.m21},${this.m22},${this.m41},${this.m42})`
        : `matrix3d(${this.toFloat64Array().join(",")})`
    }
  }

  // @ts-expect-error - polyfill
  globalThis.DOMMatrix = DOMMatrix
  // @ts-expect-error - polyfill
  globalThis.DOMPoint = DOMPoint
}
