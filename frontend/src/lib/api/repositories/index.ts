/**
 * Repository レイヤーの re-export。
 *
 * 各 repository は named export で個別関数を公開し、
 * ここで namespace re-export (`export * as xxxRepository`) する設計。
 * これにより `import { plotRepository } from "@/lib/api/repositories"` のように
 * namespace 単位でまとめてインポートできる。
 */
export * as adminRepository from "./adminRepository";
export * as authRepository from "./authRepository";
export * as historyRepository from "./historyRepository";
export * as imageRepository from "./imageRepository";
export * as plotRepository from "./plotRepository";
export * as searchRepository from "./searchRepository";
export * as sectionRepository from "./sectionRepository";
export * as snapshotRepository from "./snapshotRepository";
export * as snsRepository from "./snsRepository";
