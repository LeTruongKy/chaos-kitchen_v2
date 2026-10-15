import * as THREE from 'three';

interface Particle {
  active: boolean;
  type: string;
  age: number;
  maxAge: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
}

function createSoftParticleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class ParticleSystem {
  public group = new THREE.Group();
  private maxParticles = 400;
  private particles: Particle[] = [];
  
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();
  
  constructor() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        type: '',
        age: 0,
        maxAge: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 1
      });
    }
    
    const geo = new THREE.PlaneGeometry(1, 1);
    const softTex = createSoftParticleTexture();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: softTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    
    this.mesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    // Initialize color buffer so setColorAt works
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxParticles * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    
    // Move all particles out of view initially
    this.dummy.position.set(0, -1000, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < this.maxParticles; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    
    this.group.add(this.mesh);
  }
  
  emit(type: string, pos: THREE.Vector3, count: number = 1, dir?: THREE.Vector3) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) return;
      
      p.active = true;
      p.type = type;
      p.age = 0;
      p.pos.copy(pos);
      // Slight horizontal jitter around emission center so puffs look organic
      p.pos.x += (Math.random() - 0.5) * 14;
      p.pos.z += (Math.random() - 0.5) * 14;
      
      if (type === 'smoke') {
        p.maxAge = 0.9 + Math.random() * 0.5;
        p.vel.set((Math.random() - 0.5) * 16, 28 + Math.random() * 18, (Math.random() - 0.5) * 16);
        p.color.setHex(Math.random() > 0.4 ? 0x4a4a4a : 0x686868);
        p.size = 13 + Math.random() * 8;
      } else if (type === 'fire') {
        p.maxAge = 0.45 + Math.random() * 0.3;
        p.vel.set((Math.random() - 0.5) * 18, 42 + Math.random() * 26, (Math.random() - 0.5) * 18);
        const palette = [0xffe047, 0xff9900, 0xff5500, 0xff2a00];
        p.color.setHex(palette[Math.floor(Math.random() * palette.length)] ?? 0xff5500);
        p.size = 14 + Math.random() * 8;
      } else if (type === 'steam') {
        p.maxAge = 0.85 + Math.random() * 0.35;
        p.vel.set((Math.random() - 0.5) * 10, 20 + Math.random() * 14, (Math.random() - 0.5) * 10);
        p.color.setHex(0xf1f5f9);
        p.size = 9 + Math.random() * 6;
      } else if (type === 'foam') { // For extinguisher
        p.maxAge = 0.45 + Math.random() * 0.25;
        if (dir) {
          p.vel.copy(dir).multiplyScalar(135).add(
            new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 28, (Math.random() - 0.5) * 45)
          );
        } else {
          p.vel.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 50);
        }
        p.color.setHex(0xf8fafc);
        p.size = 11 + Math.random() * 7;
      } else if (type === 'chop') {
        p.maxAge = 0.32;
        p.vel.set((Math.random() - 0.5) * 55, 36 + Math.random() * 24, (Math.random() - 0.5) * 55);
        p.color.setHex(0xaaddaa);
        p.size = 5 + Math.random() * 3;
      } else if (type === 'dust') {
        // Overcooked 2 style dash/sprint dust puff at chef feet
        p.maxAge = 0.42 + Math.random() * 0.2;
        p.pos.x += (Math.random() - 0.5) * 8;
        p.pos.z += (Math.random() - 0.5) * 8;
        p.vel.set((Math.random() - 0.5) * 18, 10 + Math.random() * 12, (Math.random() - 0.5) * 18);
        p.color.setHex(0xfef9c3);
        p.size = 10 + Math.random() * 6;
      } else if (type === 'bubble') {
        // Sink dishwashing soap bubbles
        p.maxAge = 0.65 + Math.random() * 0.3;
        p.vel.set((Math.random() - 0.5) * 24, 26 + Math.random() * 18, (Math.random() - 0.5) * 24);
        p.color.setHex(Math.random() > 0.35 ? 0xe0f2fe : 0x7dd3fc);
        p.size = 6 + Math.random() * 4;
      } else {
        p.maxAge = 0.8;
        p.vel.set(0, 20, 0);
        p.color.setHex(0xffffff);
        p.size = 10;
      }
    }
  }
  
  private getFreeParticle(): Particle | null {
    return this.particles.find(p => !p.active) || null;
  }
  
  update(dt: number, cameraRotation: THREE.Euler) {
    let instanceCount = 0;
    
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p || !p.active) continue;
      
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        // Move it out of view
        this.dummy.position.set(0, -1000, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      
      // Integrate
      p.pos.addScaledVector(p.vel, dt);
      
      // Update dummy for InstancedMesh
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.copy(cameraRotation); // billboard
      
      // Scale over time
      const life = p.age / p.maxAge;
      let s = p.size;
      if (p.type === 'smoke' || p.type === 'steam') {
        s *= (0.75 + life * 0.95) * (1 - Math.pow(life, 3) * 0.5); // puff out then gently dissipate
      } else if (p.type === 'fire') {
        s *= (1.05 - life * 0.85); // taper off as flame rises
      } else if (p.type === 'foam' || p.type === 'dust') {
        s *= (0.85 + life * 0.7) * (1 - life * 0.55);
      } else if (p.type === 'bubble') {
        s *= (0.7 + life * 0.65) * (1 - Math.pow(life, 4));
      }
      this.dummy.scale.set(s, s, s);
      
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      if (p.type === 'fire') {
        // Transition fire spark color towards deeper orange-red as it rises
        this.tempColor.copy(p.color).lerp(new THREE.Color(0xd92600), life * 0.65);
        this.mesh.setColorAt(i, this.tempColor);
      } else {
        this.mesh.setColorAt(i, p.color);
      }
      
      instanceCount++;
    }
    
    if (instanceCount > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
