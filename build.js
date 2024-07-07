const swc = require("@swc/core");
const fs = require("fs");
const path = require("path");

const mkdirSyncRecursive = (directory) => {
  const parentDirectory = path.dirname(directory);
  if (!fs.existsSync(parentDirectory)) {
    mkdirSyncRecursive(parentDirectory);
  }
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
};

const compile = async (filePath) => {
  const sourceCode = fs.readFileSync(filePath, "utf-8");
  const { code } = await swc.transform(sourceCode, {
    filename: path.basename(filePath),
    jsc: {
      parser: {
        syntax: "typescript",
        tsx: true,
        dynamicImport: true,
        decorators: true  
      },
      target: "es2021",
      loose: true,
      externalHelpers: true
    },
    module: {
      type: "commonjs"
    }
  });
  return code;
};

const compileDirectory = async (srcDir, outDir) => {
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const fullPath = path.join(srcDir, file);
    const outPath = path.join(outDir, file.replace(/\.ts$/, '.js')); 
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (!fs.existsSync(outPath)) mkdirSyncRecursive(outPath);
      await compileDirectory(fullPath, outPath);
    } else {
      // Skip JSON files
      if (path.extname(file) === ".json") {
        mkdirSyncRecursive(path.dirname(outPath)); 
        fs.copyFileSync(fullPath, outPath);
        continue;
      }
      try {
        const compiledCode = await compile(fullPath);
        mkdirSyncRecursive(path.dirname(outPath));  
        fs.writeFileSync(outPath, compiledCode);
      } catch (error) {
        console.error(`Failed to compile ${fullPath}:`, error);
      }
    }
  }
};

compileDirectory("src", "dist").then(() => {
  console.log("Compilation complete.");
}).catch(err => {
  console.error("Compilation failed:", err);
});
