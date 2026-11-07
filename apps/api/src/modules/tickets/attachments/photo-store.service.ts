import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getConfig } from "../../../config/env.config";
import { PHOTO_LIMITS } from "./photo.constants";

@Injectable()
export class PhotoStore {
  private readonly directory = getConfig().photosDirectory;
  private path(key: string) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(key))
      throw new Error("Invalid photo storage key");
    return join(this.directory, key);
  }
  async normalize(file: Express.Multer.File | undefined) {
    if (!file || file.size > PHOTO_LIMITS.bytes)
      throw new BadRequestException("请选择不超过 5MB 的图片");
    try {
      const pipeline = sharp(file.buffer, {
        limitInputPixels: PHOTO_LIMITS.pixels,
        failOn: "warning",
      });
      const metadata = await pipeline.metadata();
      const mime: Record<string, string> = {
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      if (
        !metadata.format ||
        !mime[metadata.format] ||
        mime[metadata.format] !== file.mimetype ||
        (metadata.pages ?? 1) > 1
      )
        throw Error("Unsupported image");
      const { data, info } = await pipeline
        .rotate()
        .resize({
          width: PHOTO_LIMITS.edge,
          height: PHOTO_LIMITS.edge,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      if (data.length > PHOTO_LIMITS.bytes)
        throw Error("Encoded image too large");
      return {
        data,
        width: info.width,
        height: info.height,
        bytes: data.length,
      };
    } catch {
      throw new BadRequestException(
        "图片无效：仅支持静态 JPG、PNG、WebP，最多 2400 万像素",
      );
    }
  }
  async write(key: string, data: Buffer) {
    await mkdir(this.directory, { recursive: true });
    try {
      await writeFile(this.path(key), data, { flag: "wx" });
    } catch (error) {
      // A failed exclusive write can leave a partial file; preserve collisions.
      if ((error as NodeJS.ErrnoException).code !== "EEXIST")
        await this.remove(key);
      throw error;
    }
  }
  async remove(key: string) {
    await unlink(this.path(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  async read(key: string) {
    try {
      return await readFile(this.path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new NotFoundException("图片文件不存在");
      throw error;
    }
  }
}
