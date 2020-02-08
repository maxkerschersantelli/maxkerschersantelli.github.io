"use strict";

function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }
    
    //var buffers = setGeometry(gl, getFShape());

    var buffers = window.primitives.createSphereBuffers(gl, 10, 48, 24);

    // setup GLSL program
    var program = webglUtils.createProgramFromScripts(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
    var uniformSetters = webglUtils.createUniformSetters(gl, program);
    var attribSetters  = webglUtils.createAttributeSetters(gl, program);

    var attribs = {
        a_position: { buffer: buffers.position, numComponents: 3, },
        a_normal:   { buffer: buffers.normal,   numComponents: 3, },
        a_texcoord: { buffer: buffers.texcoord, numComponents: 2, },
    };

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    var cameraAngleRadians = degToRad(0);
    var fieldOfViewRadians = degToRad(60);
    var cameraHeight = 50;

    var uniformsThatAreTheSameForAllObjects = {
        u_lightWorldPos:         [-50, 30, 100],
        u_viewInverse:           m4.identity(),
        u_lightColor:            [1, 1, 1, 1],
    };

    var uniformsThatAreComputedForEachObject = {
        u_worldViewProjection:   m4.identity(),
        u_world:                 m4.identity(),
        u_worldInverseTranspose: m4.identity(),
    };

    var rand = function(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return min + Math.random() * (max - min);
    };

    var randInt = function(range) {
        return Math.floor(Math.random() * range);
    };

    var textures = [
        textureUtils.makeStripeTexture(gl, { color1: "#FFF", color2: "#CCC", }),
        textureUtils.makeCheckerTexture(gl, { color1: "#FFF", color2: "#CCC", }),
        textureUtils.makeCircleTexture(gl, { color1: "#FFF", color2: "#CCC", }),
    ];

    var objects = [];
    var numObjects = 300;
    var baseColor = rand(240);
    for (var ii = 0; ii < numObjects; ++ii) {
        objects.push({
            radius: rand(150),
            xRotation: rand(Math.PI * 2),
            yRotation: rand(Math.PI),
            materialUniforms: {
                u_colorMult:             chroma.hsv(rand(baseColor, baseColor + 120), 0.5, 1).gl(),
                u_diffuse:               textures[randInt(textures.length)],
                u_specular:              [1, 1, 1, 1],
                u_shininess:             rand(500),
                u_specularFactor:        rand(1),
            },
        });
    }

    requestAnimationFrame(drawScene);

    // Draw the scene.
    function drawScene(time) {
        time = time * 0.0001 + 5;

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas AND the depth buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Compute the projection matrix
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var projectionMatrix =
            m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        // Compute the camera's matrix using look at.
        var cameraPosition = [0, 0, 100];
        var target = [0, 0, 0];
        var up = [0, 1, 0];
        var cameraMatrix = m4.lookAt(cameraPosition, target, up, uniformsThatAreTheSameForAllObjects.u_viewInverse);

        // Make a view matrix from the camera matrix.
        var viewMatrix = m4.inverse(cameraMatrix);

        var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        gl.useProgram(program);

        // Setup all the needed attributes.
        webglUtils.setAttributes(attribSetters, attribs);

        // Bind the indices.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        // Set the uniforms that are the same for all objects.
        webglUtils.setUniforms(uniformSetters, uniformsThatAreTheSameForAllObjects);

        // Draw objects
        objects.forEach(function(object) {

            // Compute a position for this object based on the time.
            var worldMatrix = m4.xRotation(object.xRotation * time);
            worldMatrix = m4.yRotate(worldMatrix, object.yRotation * time);
            worldMatrix = m4.translate(worldMatrix, 0, 0, object.radius);
            uniformsThatAreComputedForEachObject.u_world = worldMatrix;

            // Multiply the matrices.
            m4.multiply(viewProjectionMatrix, worldMatrix, uniformsThatAreComputedForEachObject.u_worldViewProjection);
            m4.transpose(m4.inverse(worldMatrix), uniformsThatAreComputedForEachObject.u_worldInverseTranspose);

            // Set the uniforms we just computed
            webglUtils.setUniforms(uniformSetters, uniformsThatAreComputedForEachObject);

            // Set the uniforms that are specific to the this object.
            webglUtils.setUniforms(uniformSetters, object.materialUniforms);

            // Draw the geometry.
            gl.drawElements(gl.TRIANGLES, buffers.numElements, gl.UNSIGNED_SHORT, 0);
        });

        requestAnimationFrame(drawScene);
    }
}


// Fill the buffer with the values that define a letter 'F'.
function setGeometry(gl, geometry) {
    gl.bufferData(
        gl.ARRAY_BUFFER,
        geometry,
        gl.STATIC_DRAW);
}

// Fill the buffer with colors for the 'F'.
function setColors(gl) {
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Uint8Array([
            // left column front
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,

            // top rung front
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,

            // middle rung front
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,

            // left column back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // top rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // middle rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // top
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,

            // top rung right
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,

            // under top rung
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,

            // between top rung and middle
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,

            // top of middle rung
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,

            // right of middle rung
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,

            // bottom of middle rung.
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,

            // right of bottom
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,

            // bottom
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,

            // left side
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220]),
        gl.STATIC_DRAW);
}

function setTexcoords(gl) {
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            // left column front
            38 / 255,  44 / 255,
            38 / 255, 223 / 255,
            113 / 255,  44 / 255,
            38 / 255, 223 / 255,
            113 / 255, 223 / 255,
            113 / 255,  44 / 255,

            // top rung front
            113 / 255, 44 / 255,
            113 / 255, 85 / 255,
            218 / 255, 44 / 255,
            113 / 255, 85 / 255,
            218 / 255, 85 / 255,
            218 / 255, 44 / 255,

            // middle rung front
            113 / 255, 112 / 255,
            113 / 255, 151 / 255,
            203 / 255, 112 / 255,
            113 / 255, 151 / 255,
            203 / 255, 151 / 255,
            203 / 255, 112 / 255,

            // left column back
            38 / 255,  44 / 255,
            113 / 255,  44 / 255,
            38 / 255, 223 / 255,
            38 / 255, 223 / 255,
            113 / 255,  44 / 255,
            113 / 255, 223 / 255,

            // top rung back
            113 / 255, 44 / 255,
            218 / 255, 44 / 255,
            113 / 255, 85 / 255,
            113 / 255, 85 / 255,
            218 / 255, 44 / 255,
            218 / 255, 85 / 255,

            // middle rung back
            113 / 255, 112 / 255,
            203 / 255, 112 / 255,
            113 / 255, 151 / 255,
            113 / 255, 151 / 255,
            203 / 255, 112 / 255,
            203 / 255, 151 / 255,

            // top
            0, 0,
            1, 0,
            1, 1,
            0, 0,
            1, 1,
            0, 1,

            // top rung right
            0, 0,
            1, 0,
            1, 1,
            0, 0,
            1, 1,
            0, 1,

            // under top rung
            0, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 1,
            1, 0,

            // between top rung and middle
            0, 0,
            1, 1,
            0, 1,
            0, 0,
            1, 0,
            1, 1,

            // top of middle rung
            0, 0,
            1, 1,
            0, 1,
            0, 0,
            1, 0,
            1, 1,

            // right of middle rung
            0, 0,
            1, 1,
            0, 1,
            0, 0,
            1, 0,
            1, 1,

            // bottom of middle rung.
            0, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 1,
            1, 0,

            // right of bottom
            0, 0,
            1, 1,
            0, 1,
            0, 0,
            1, 0,
            1, 1,

            // bottom
            0, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 1,
            1, 0,

            // left side
            0, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 1,
            1, 0,
        ]),
        gl.STATIC_DRAW);
}