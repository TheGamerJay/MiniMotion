import { openDB } from 'idb';

const DB_NAME = 'mini-editor-db';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

let dbPromise = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const store = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'project.updatedAt');
          store.createIndex('name', 'project.name');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(projectData) {
  const db = await getDB();
  const { project, assets, layers, timeline } = projectData;
  
  const dataToSave = {
    id: project.id,
    project,
    assets,
    layers,
    timeline,
  };
  
  await db.put(PROJECTS_STORE, dataToSave);
  return dataToSave;
}

export async function loadProject(projectId) {
  const db = await getDB();
  return await db.get(PROJECTS_STORE, projectId);
}

export async function deleteProject(projectId) {
  const db = await getDB();
  await db.delete(PROJECTS_STORE, projectId);
}

export async function getAllProjects() {
  const db = await getDB();
  const projects = await db.getAll(PROJECTS_STORE);
  // Return sorted by updatedAt descending
  return projects.sort((a, b) => 
    new Date(b.project.updatedAt) - new Date(a.project.updatedAt)
  );
}

export async function projectExists(projectId) {
  const db = await getDB();
  const project = await db.get(PROJECTS_STORE, projectId);
  return !!project;
}

// Image data URL helpers
export function imageToDataURL(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function dataURLToImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}
