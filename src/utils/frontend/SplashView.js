import * as THREE from 'three';
export class SplashView {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orb = null;
    this.glowSprite = null;
    this.scientificObjects = [];
    this.invisibleObjects = [];
    this.animationId = null;
    this.animationTime = 0;
    this.phase = 'formation';
    this.stopSpawning = false;
    this.gravityActive = true;
    this.currentOrbSize = 7;
    this.targetOrbSize = 7;
    this.orbInitialY = 0;
    this.isStaticMode = false;
    this.invisibleObjectsCount = 25;
    this.fadeInStartTime = 0.0;
    this.fadeInDuration = 8.0;
    this.invisibleObjectsVisible = false;
    this.onAnimationComplete = null;
    this.colors = {
      background: 0x02020E,
      pearlWhite: 0xFFFDF0,
      warmPearl: 0xFFF9E6,
      coolPearl: 0xF5F7FF,
      glowPearl: 0xFFFEF5,
      trailColor: 0xE8F4FF
    };
    this.audioEffects = {
      effect1: new Audio('/assets/audio/efectop1.mp3'),
      effect2: new Audio('/assets/audio/efectop2.mp3')
    };
  }

   initThreeJS() {
    const threeContainer = document.getElementById('threeContainer');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);
    this.scene.fog = new THREE.Fog(this.colors.background, 400, 900);
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = 450;
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    threeContainer.appendChild(this.renderer.domElement);
    const ambientLight = new THREE.AmbientLight(this.colors.pearlWhite, 0.4);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(this.colors.pearlWhite, 1.5, 600);
    pointLight.position.set(0, 0, 150);
    this.scene.add(pointLight);
    const fillLight = new THREE.PointLight(this.colors.warmPearl, 0.8, 500);
    fillLight.position.set(-100, 100, 100);
    this.scene.add(fillLight);
    const accentLight = new THREE.PointLight(this.colors.coolPearl, 0.4, 300);
    accentLight.position.set(100, -100, 50);
    this.scene.add(accentLight);
    this.createOrb();
    this.createInvisibleObjects();
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }
    createOrb() {
      const orbGeometry = new THREE.IcosahedronGeometry(4, 4);
      const orbMaterial = new THREE.MeshPhysicalMaterial({
        color: this.colors.pearlWhite,
        emissive: this.colors.glowPearl,
        emissiveIntensity: 0.35,
        roughness: 0.02,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        transparent: false,
        flatShading: false,
        side: THREE.FrontSide
      });
      this.orb = new THREE.Mesh(orbGeometry, orbMaterial);
      this.orb.position.set(0, 0, 0);
      this.scene.add(this.orb);
      this.createSimpleGlow();
      this.orbInitialY = this.orb.position.y;
    }
    createAtom() {
        const group = new THREE.Group();
        const nucleus = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.8, 4),
          new THREE.MeshPhysicalMaterial({ 
            color: this.colors.pearlWhite,
            emissive: this.colors.glowPearl,
            emissiveIntensity: 0.25,
            roughness: 0.15,
            metalness: 0.1,
            clearcoat: 0.8,
            flatShading: false
          })
        );
        group.add(nucleus);
        for (let i = 0; i < 2; i++) {
          const orbit = new THREE.Mesh(
            new THREE.TorusGeometry(7, 0.2, 8, 32),
            new THREE.MeshPhysicalMaterial({ 
              color: this.colors.pearlWhite,
              emissive: this.colors.glowPearl,
              emissiveIntensity: 0.1,
              transparent: true,
              opacity: 0.5,
              roughness: 0.2
            })
          );
          orbit.rotation.x = Math.PI / 2;
          orbit.rotation.z = (i * Math.PI) / 3;
          group.add(orbit);
          const electron = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.8, 3),
            new THREE.MeshPhysicalMaterial({ 
              color: this.colors.pearlWhite,
              emissive: this.colors.glowPearl,
              emissiveIntensity: 0.2,
              roughness: 0.1,
              flatShading: false
            })
          );
          electron.position.x = 7;
          orbit.add(electron);
        }
        return group;
    }
     createMolecule() {
        const group = new THREE.Group();
        const count = 2 + Math.floor(Math.random() * 3); 
        for (let i = 0; i < count; i++) {
          const sphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.8, 4),
            new THREE.MeshPhysicalMaterial({ 
              color: this.colors.pearlWhite,
              emissive: this.colors.glowPearl,
              emissiveIntensity: 0.2,
              roughness: 0.15,
              metalness: 0.1,
              clearcoat: 0.7,
              flatShading: false
            })
          );
          sphere.position.x = (i - count / 2) * 5.5;
          group.add(sphere);
          if (i > 0) {
            const bond = new THREE.Mesh(
              new THREE.CylinderGeometry(0.3, 0.3, 5.5, 8),
              new THREE.MeshPhysicalMaterial({ 
                color: this.colors.pearlWhite,
                emissive: this.colors.glowPearl,
                emissiveIntensity: 0.1,
                transparent: true,
                opacity: 0.7,
                roughness: 0.2
              })
            );
            bond.rotation.z = Math.PI / 2;
            bond.position.x = sphere.position.x - 2.75;
            group.add(bond);
          }
        }
        return group;
    }
     createBondStructure() {
        const group = new THREE.Group();
        const nodes = 3 + Math.floor(Math.random() * 3); 
        for (let i = 0; i < nodes; i++) {
          const angle = (i / nodes) * Math.PI * 2;
          const radius = 5.5;
          const node = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.3, 4),
            new THREE.MeshPhysicalMaterial({ 
              color: this.colors.pearlWhite,
              emissive: this.colors.glowPearl,
              emissiveIntensity: 0.18,
              roughness: 0.15,
              flatShading: false
            })
          );
          node.position.x = Math.cos(angle) * radius;
          node.position.y = Math.sin(angle) * radius;
          group.add(node);
          const bond = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, radius, 16),
            new THREE.MeshPhysicalMaterial({ 
              color: this.colors.pearlWhite,
              emissive: this.colors.glowPearl,
              emissiveIntensity: 0.08,
              transparent: true,
              opacity: 0.6,
              roughness: 0.25
            })
          );
          bond.position.x = Math.cos(angle) * radius / 2;
          bond.position.y = Math.sin(angle) * radius / 2;
          bond.rotation.z = -angle + Math.PI / 2;
          group.add(bond);
        }
        return group;
    } 
      createTrail(position, velocity) {
        const segments = 4;
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(segments * 3);
        const alphas = new Float32Array(segments); 
        for (let i = 0; i < segments; i++) {
          positions[i * 3] = position.x;
          positions[i * 3 + 1] = position.y;
          positions[i * 3 + 2] = position.z;
          alphas[i] = 1.0 - (i / segments);
        }
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        const trailMaterial = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(this.colors.trailColor) },
            time: { value: 0 }
          },
          vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
              vAlpha = alpha;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            varying float vAlpha;
            void main() {
              gl_FragColor = vec4(color, vAlpha * 0.3);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        trail.userData = {
          life: 1.0,
          maxLife: 1.0,
          positions: positions,
          alphas: alphas,
          velocity: velocity ? velocity.clone() : new THREE.Vector3(),
          index: 0,
          updatePositions: function(newPos) {
            for (let i = this.positions.length/3 - 1; i > 0; i--) {
              this.positions[i * 3] = this.positions[(i-1) * 3];
              this.positions[i * 3 + 1] = this.positions[(i-1) * 3 + 1];
              this.positions[i * 3 + 2] = this.positions[(i-1) * 3 + 2];
            }
            this.positions[0] = newPos.x;
            this.positions[1] = newPos.y;
            this.positions[2] = newPos.z;
            
            trail.geometry.attributes.position.needsUpdate = true;
          }
        };
        this.scene.add(trail);
        return trail;
    }
    spawnScientificObject() {
        if (this.stopSpawning) return;
        const types = [
          () => this.createAtom(),
          () => this.createMolecule(),
          () => this.createBondStructure()
        ];
        const obj = types[Math.floor(Math.random() * types.length)]();
        const spawnType = Math.floor(Math.random() * 6);
        const distance = 500;
        const offset = () => (Math.random() - 0.5) * 400;
        switch(spawnType) {
          case 0: obj.position.set(offset(), offset(), distance); break;
          case 1: obj.position.set(offset(), offset(), -distance); break;
          case 2: obj.position.set(offset(), distance, offset()); break;
          case 3: obj.position.set(offset(), -distance, offset()); break;
          case 4: obj.position.set(distance, offset(), offset()); break;
          case 5: obj.position.set(-distance, offset(), offset()); break;
        }
        const velocity = new THREE.Vector3().subVectors(this.orb.position, obj.position).normalize();
        velocity.multiplyScalar(0.5 + Math.random() * 0.5);
        obj.userData = {
          velocity: velocity,
          absorbed: false,
          fadeOut: 1.0,
          energy: 1.0,
          trails: [],
          trailTimer: 0,
          idleRotation: new THREE.Vector3(
            (Math.random() - 0.5) * 0.015,
            (Math.random() - 0.5) * 0.015,
            (Math.random() - 0.5) * 0.015
          ),
          pulseSpeed: 0.5 + Math.random() * 1.0,
          pulsePhase: Math.random() * Math.PI * 2
        };
        this.scene.add(obj);
        this.scientificObjects.push(obj);
    }
     animate() {
  if (this.isStaticMode) {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    return;
  }
  this.animationTime += 0.016;
  const deltaTime = 0.033;
  if (this.phase === 'formation' && this.animationTime < 8) {
    if (this.animationTime < 6.5 && Math.random() < 0.3) {
      const burst = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i++) {
        setTimeout(() => this.spawnScientificObject(), i * 60);
      }
    }
    for (let i = this.scientificObjects.length - 1; i >= 0; i--) {
      const obj = this.scientificObjects[i]; 
      if (!obj.userData.absorbed) {
        const pulse = 0.9 + 0.1 * Math.sin(this.animationTime * obj.userData.pulseSpeed + obj.userData.pulsePhase);
        obj.scale.setScalar(pulse);
        if (this.gravityActive) {
          const direction = new THREE.Vector3().subVectors(this.orb.position, obj.position);
          const distance = direction.length();
          obj.userData.trailTimer += deltaTime;
          if (obj.userData.trailTimer > 0.1 && distance > 25) {
            obj.userData.trailTimer = 0;
            const trail = this.createTrail(obj.position, obj.userData.velocity);
            obj.userData.trails.push(trail);
          }
          if (distance < 18) {
            obj.userData.absorbed = true;
            obj.userData.fadeOut = 1.0;
            this.currentOrbSize = Math.min(this.targetOrbSize, this.currentOrbSize + 0.1);
            this.orb.material.emissiveIntensity = Math.min(0.45, this.orb.material.emissiveIntensity + 0.01);
            if (this.glowSprite) {
              const glowScale = 25 + (this.currentOrbSize - 4) * 2;
              this.glowSprite.scale.set(glowScale, glowScale, 1);
            }
            if (this.currentOrbSize >= this.targetOrbSize - 0.5) {
              this.stopSpawning = true;
            }
          } else {
            direction.normalize();
            const force = 0.25 * (1 / Math.max(distance * 0.008, 0.3));
            obj.userData.velocity.add(direction.multiplyScalar(force));
            obj.userData.velocity.multiplyScalar(0.985);
          }
          obj.position.add(obj.userData.velocity);
          obj.rotation.x += obj.userData.idleRotation.x * 0.5;
          obj.rotation.y += obj.userData.idleRotation.y * 0.5;
          obj.rotation.z += obj.userData.idleRotation.z * 0.5;
        } else {
          obj.rotation.x += obj.userData.idleRotation.x;
          obj.rotation.y += obj.userData.idleRotation.y;
          obj.rotation.z += obj.userData.idleRotation.z;
          obj.position.x += Math.sin(this.animationTime * 0.8 + i) * 0.08;
          obj.position.y += Math.cos(this.animationTime * 0.6 + i) * 0.08;
          obj.position.z += Math.sin(this.animationTime * 0.5 + i * 0.5) * 0.05;
        }
      } else if (obj.userData.fadeOut > 0) {
        obj.userData.fadeOut -= 0.015;
        obj.userData.energy -= 0.02;
        const fadeScale = Math.max(0, obj.userData.fadeOut);
        obj.scale.setScalar(0.3 + fadeScale * 0.7);
        obj.traverse(child => {
          if (child.material) {
            child.material.opacity = fadeScale * 0.9;
            child.material.transparent = true;
            if (child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = Math.max(0, obj.userData.energy) * 0.25;
            }
          }
        });
        if (obj.userData.fadeOut <= 0) {
          this.scene.remove(obj);
          this.scientificObjects.splice(i, 1);
        }
      }
      obj.userData.trails = obj.userData.trails.filter(trail => {
        trail.userData.life -= 0.03; 
        if (!obj.userData.absorbed && trail.userData.updatePositions) {
          trail.userData.updatePositions(obj.position);
        }
        const alphas = trail.geometry.attributes.alpha.array;
        for (let j = 0; j < alphas.length; j++) {
          alphas[j] = alphas[j] * trail.userData.life;
        }
        trail.geometry.attributes.alpha.needsUpdate = true;
        if (trail.userData.life <= 0) {
          this.scene.remove(trail);
          trail.geometry.dispose();
          trail.material.dispose();
          return false;
        }
        return true;
      });
    }
    if (this.animationTime >= this.fadeInStartTime) {
      this.updateInvisibleObjects(deltaTime);
    }
    const targetScale = this.currentOrbSize / 4;
    this.orb.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.02);
    if (this.animationTime >= 6.5 && this.gravityActive) {
      this.gravityActive = false;
      this.stopSpawning = true;
    }
    if (this.animationTime >= 5.5) {
      const fallTime = this.animationTime - 5.5;
      const fallDuration = 2.0;
      if (fallTime < fallDuration) {
        const t = fallTime / fallDuration;
        if (t < 0.4) {
          const fallT = t / 0.4;
          const eased = fallT * fallT * fallT;
          this.orb.position.y = this.orbInitialY - eased * 180;
        }
        else if (t < 0.7) {
          const bounceT = (t - 0.4) / 0.3;
          const bounce = Math.sin(bounceT * Math.PI);
          this.orb.position.y = this.orbInitialY - 180 + bounce * 70;
        }
        else {
          const returnT = (t - 0.7) / 0.3;
          const secondBounce = Math.sin(returnT * Math.PI) * 20 * (1 - returnT);
          const eased = 1 - Math.pow(1 - returnT, 4);
          this.orb.position.y = this.orbInitialY - 110 + eased * 110 + secondBounce;
        }
      }
    }
  }
  if (this.animationTime >= 8 && this.phase === 'formation') {
    this.phase = 'logo';
    this.startPhase2();
  }
  if (this.orb && !this.isStaticMode) {
    this.orb.rotation.y += 0.003;
    this.orb.rotation.x = Math.sin(this.animationTime * 0.2) * 0.05; 
    const pulse = 0.95 + 0.05 * Math.sin(this.animationTime * 1.5);
    this.orb.material.emissiveIntensity = 0.35 * pulse;
  }
  if (this.renderer && this.scene && this.camera) {
    this.renderer.render(this.scene, this.camera);
  }
  if (this.phase !== 'complete') {
    this.animationId = requestAnimationFrame(() => this.animate());
  }}
    startAnimation() {
    this.audioEffects.effect1.play().catch(() => console.warn("Audio 1 bloqueado"));
    this.animate();}
startPhase2() {
  const threeContainer = document.getElementById('threeContainer');
  const logoContainer = document.getElementById('logoContainer');
  const wink = document.getElementById('winkAnimation');
  if (this.orb) this.orb.visible = false;
  if (this.glowSprite) this.glowSprite.visible = false;
  if (logoContainer && wink) {
    logoContainer.style.display = 'flex';
    const originalSrc = wink.src;
    wink.src = '';
    wink.src = originalSrc; 
    setTimeout(() => {
      wink.style.opacity = '1';
      this.audioEffects.effect2.play().catch(() => {});
      
      setTimeout(() => { 
        wink.style.display = 'none';
        if (threeContainer) {
          this.startInvisibleObjectsFadeOut();
        }
      }, 1000);
    }, 50);
  } 
  setTimeout(() => {
    this.completeAnimation();
  }, 1500);
}
completeAnimation() {
  this.phase = 'complete';
  this.isStaticMode = true;
  if (this.animationId) {
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }
  if (this.renderer && this.scene && this.camera) {
    this.renderer.render(this.scene, this.camera);
  }
  if (this.onAnimationComplete) {
    this.onAnimationComplete();
  }
}
  startInvisibleObjectsFadeOut() {
    const fadeOutDuration = 1.0;
    const startTime = this.animationTime;
    const fadeOutAnimation = () => {
      if (this.isStaticMode) return;
      const elapsed = this.animationTime - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      this.scientificObjects.forEach(obj => {
        if (!obj.userData.absorbed) {
          const opacity = 1 - progress;
          obj.traverse(child => {
            if (child.material) {
              child.material.transparent = true;
              child.material.opacity = opacity;
            }
          });
        }
      });
      this.invisibleObjects.forEach(obj => {
        const opacity = obj.userData.maxOpacity * (1 - progress);
        obj.traverse(child => {
          if (child.material) {
            child.material.opacity = opacity;
            if (child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = opacity * 0.5;
            }
          }
        });
      });
      if (progress >= 1) {
        const threeContainer = document.getElementById('threeContainer');
        if (threeContainer) {
          threeContainer.style.transition = 'opacity 0.3s';
          threeContainer.style.opacity = '0';
        }
      } else {
        requestAnimationFrame(fadeOutAnimation);
      }
    };
    fadeOutAnimation();
  }
  createInvisibleObjects() {
      const invisibleTypes = [
        () => this.createInvisibleAtom(),
        () => this.createInvisibleMolecule(),
        () => this.createInvisibleCrystal()
      ];
      for (let i = 0; i < this.invisibleObjectsCount; i++) {
        const typeIndex = Math.floor(Math.random() * invisibleTypes.length);
        const obj = invisibleTypes[typeIndex]();
        const radius = 150 + Math.random() * 200;
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        obj.position.x = radius * Math.sin(phi) * Math.cos(theta);
        obj.position.y = radius * Math.sin(phi) * Math.sin(theta) + this.orb.position.y;
        obj.position.z = radius * Math.cos(phi);
        obj.rotation.x = Math.random() * Math.PI * 2;
        obj.rotation.y = Math.random() * Math.PI * 2;
        obj.rotation.z = Math.random() * Math.PI * 2;
        obj.userData = {
          type: 'invisible',
          originalScale: obj.scale.clone(),
          originalPosition: obj.position.clone(),
          floatAmplitude: 0.3 + Math.random() * 0.7,
          floatSpeed: 0.5 + Math.random() * 1.0,
          rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
          ),
          phaseOffset: Math.random() * Math.PI * 2,
          opacity: 0,
          maxOpacity: 0.3 + Math.random() * 0.4,
          fadeInProgress: 0,
          isFadingIn: false
        };
        obj.traverse((child) => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = 0;
            if (Math.random() > 0.5) {
              child.material.color.setHex(this.colors.coolPearl);
            } else {
              child.material.color.setHex(this.colors.warmPearl);
            }
            child.material.emissiveIntensity = 0;
          }
        });
        this.scene.add(obj);
        this.invisibleObjects.push(obj);
      }
    }
      createInvisibleAtom() {
        const group = new THREE.Group();
        const nucleus = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.5, 2),
          new THREE.MeshPhysicalMaterial({
            color: this.colors.pearlWhite,
            roughness: 0.3,
            metalness: 0.1,
            transparent: true
          })
        );
        group.add(nucleus);
        const orbit = new THREE.Mesh(
          new THREE.TorusGeometry(4, 0.15, 12, 48),
          new THREE.MeshPhysicalMaterial({
            color: this.colors.trailColor,
            transparent: true,
            roughness: 0.4
          })
        );
        orbit.rotation.x = Math.PI / 2;
        group.add(orbit);
        const electron = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.6, 1),
          new THREE.MeshPhysicalMaterial({
            color: this.colors.pearlWhite,
            roughness: 0.2,
            transparent: true
          })
        );
        electron.position.x = 4;
        orbit.add(electron);
        return group;
    }
     createInvisibleMolecule() {
        const group = new THREE.Group();
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const sphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.2, 2),
            new THREE.MeshPhysicalMaterial({
              color: this.colors.pearlWhite,
              roughness: 0.3,
              transparent: true
            })
          );
          sphere.position.x = (i - (count - 1) / 2) * 4;
          group.add(sphere);
          if (i > 0) {
            const bond = new THREE.Mesh(
              new THREE.CylinderGeometry(0.2, 0.2, 4, 8),
              new THREE.MeshPhysicalMaterial({
                color: this.colors.trailColor,
                transparent: true,
                roughness: 0.4
              })
            );
            bond.rotation.z = Math.PI / 2;
            bond.position.x = sphere.position.x - 2;
            group.add(bond);
          }
        }
        return group;
    }
    createInvisibleCrystal() {
    const group = new THREE.Group();
    const vertices = [];
    vertices.push(new THREE.Vector3(0, 0, 3));
    vertices.push(new THREE.Vector3(0, 0, -3));
    vertices.push(new THREE.Vector3(3, 0, 0));
    vertices.push(new THREE.Vector3(-3, 0, 0));
    vertices.push(new THREE.Vector3(0, 3, 0));
    vertices.push(new THREE.Vector3(0, -3, 0));
    vertices.forEach(vertex => {
      const sphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshPhysicalMaterial({
          color: this.colors.pearlWhite,
          roughness: 0.3,
          transparent: true
        })
      );
      sphere.position.copy(vertex);
      group.add(sphere);
    });
    const connections = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [2, 5], [3, 4], [3, 5]
    ];
    connections.forEach(([i, j]) => {
      const start = vertices[i];
      const end = vertices[j];
      const distance = start.distanceTo(end);
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const bond = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, distance, 6),
        new THREE.MeshPhysicalMaterial({
          color: this.colors.trailColor,
          transparent: true,
          roughness: 0.4
        })
      );  
      bond.position.copy(start).add(direction.clone().multiplyScalar(distance / 2));
      bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      group.add(bond);
    });
    return group;}
    updateInvisibleObjects(deltaTime) {
    const currentTime = this.animationTime;
    if (currentTime >= this.fadeInStartTime && !this.invisibleObjectsVisible) {
      this.invisibleObjectsVisible = true;
      this.startInvisibleObjectsFadeIn();
    }
    for (let i = 0; i < this.invisibleObjects.length; i++) {
      const obj = this.invisibleObjects[i];
      const userData = obj.userData;
      const floatTime = currentTime * userData.floatSpeed + userData.phaseOffset;
      const floatY = Math.sin(floatTime) * userData.floatAmplitude;
      const floatX = Math.cos(floatTime * 0.7) * userData.floatAmplitude * 0.5;
      const floatZ = Math.sin(floatTime * 0.3) * userData.floatAmplitude * 0.5;
      obj.position.y = userData.originalPosition.y + floatY;
      obj.position.x = userData.originalPosition.x + floatX;
      obj.position.z = userData.originalPosition.z + floatZ;
      obj.rotation.x += userData.rotationSpeed.x;
      obj.rotation.y += userData.rotationSpeed.y;
      obj.rotation.z += userData.rotationSpeed.z;
      const pulse = 1 + Math.sin(currentTime * 0.8 + userData.phaseOffset) * 0.05;
      obj.scale.copy(userData.originalScale).multiplyScalar(pulse);
      if (userData.isFadingIn && userData.fadeInProgress < 1) {
        userData.fadeInProgress += deltaTime / this.fadeInDuration;
        userData.fadeInProgress = Math.min(userData.fadeInProgress, 1);
        const easedOpacity = this.easeInOutCubic(userData.fadeInProgress) * userData.maxOpacity;
        userData.opacity = easedOpacity;
        obj.traverse((child) => {
          if (child.material) {
            child.material.opacity = easedOpacity;
            if (child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = easedOpacity * 0.5;
            }
          }
        });
      }
    }
  }
   startInvisibleObjectsFadeIn() {
    this.invisibleObjects.forEach((obj, index) => {
      setTimeout(() => {
        obj.userData.isFadingIn = true;
      }, index * 100);
    });
  }
  destroy() {
  if (this.animationId) {
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }
  window.removeEventListener('resize', this.onResize);
  Object.values(this.audioEffects).forEach(audio => {
    audio.pause();
    audio.src = "";
  });
  this.scientificObjects.forEach(obj => {
    if (obj.userData.trails) {
      obj.userData.trails.forEach(trail => {
        this.scene.remove(trail);
        if (trail.geometry) trail.geometry.dispose();
        if (trail.material) trail.material.dispose();
      });
    }
  });
  this.invisibleObjects.forEach(obj => {
    this.scene.remove(obj);
  });
  if (this.renderer) {
    this.renderer.dispose();
  }
  if (this.scene) {
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
  const threeContainer = document.getElementById('threeContainer');
  if (threeContainer && this.renderer && this.renderer.domElement) {
    threeContainer.removeChild(this.renderer.domElement);
  }}
  easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;}

   createSimpleGlow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 254, 245, 0.4)');
    gradient.addColorStop(0.3, 'rgba(255, 254, 245, 0.2)');
    gradient.addColorStop(0.6, 'rgba(255, 254, 245, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 254, 245, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowSprite = new THREE.Sprite(spriteMaterial);
    this.glowSprite.scale.set(25, 25, 1);
    this.orb.add(this.glowSprite);
  }
  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);}

     easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}