import { loadConfig } from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent, type Identity } from "@icp-sdk/core/agent";

/**
 * Resolves a direct, browser-cacheable URL for a stored asset (video or
 * thumbnail) from its asset id/hash.
 *
 * Builds an authenticated HttpAgent from the caller's identity (when signed
 * in) and the cached deployment config, then asks the object-storage client
 * for the direct gateway URL.
 */
export class StorageService {
  async getDirectURL(assetId: string, identity?: Identity): Promise<string> {
    const config = await loadConfig();

    const agent = new HttpAgent({
      identity,
      host: config.backend_host,
    });

    const client = new StorageClient(
      config.bucket_name,
      config.storage_gateway_url,
      config.backend_canister_id,
      config.project_id,
      agent,
    );

    return client.getDirectURL(assetId);
  }
}

export const storageService = new StorageService();
