import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";

type HttpMethod = "get" | "post" | "put" | "delete";

@Injectable()
export class DeerFlowGatewayService {
  private readonly logger = new Logger(DeerFlowGatewayService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  async listModels(): Promise<unknown> {
    return this.request("get", "/models");
  }

  async getModel(modelName: string): Promise<unknown> {
    return this.request("get", `/models/${encodeURIComponent(modelName)}`);
  }

  async getMcpConfig(): Promise<unknown> {
    return this.request("get", "/mcp/config");
  }

  async updateMcpConfig(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("put", "/mcp/config", payload);
  }

  async getMemory(): Promise<unknown> {
    return this.requestWithFallback("get", "/memory", "/%E5%86%85%E5%AD%98");
  }

  async clearMemory(): Promise<unknown> {
    return this.requestWithFallback("delete", "/memory", "/%E5%86%85%E5%AD%98");
  }

  async reloadMemory(payload: Record<string, unknown> = {}): Promise<unknown> {
    return this.request("post", "/memory/reload", payload);
  }

  async createMemoryFact(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("post", "/memory/facts", payload);
  }

  private async requestWithFallback(
    method: HttpMethod,
    primaryPath: string,
    fallbackPath: string
  ): Promise<unknown> {
    try {
      return await this.request(method, primaryPath);
    } catch (error) {
      if (!this.isNotFound(error)) {
        throw error;
      }

      this.logger.warn(`Path ${primaryPath} not found, fallback to ${fallbackPath}`);
      return this.request(method, fallbackPath);
    }
  }

  private async request(
    method: HttpMethod,
    path: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    const url = this.buildGatewayUrl(path);
    const headers = this.gatewayHeaders;

    try {
      const response = await firstValueFrom(
        this.httpService.request<unknown>({
          method,
          url,
          data,
          headers
        })
      );
      return response.data;
    } catch (error) {
      throw this.toGatewayException(error, method, url);
    }
  }

  private get gatewayHeaders(): Record<string, string> {
    const apiKey = this.configService.get<string>("DEERFLOW_API_KEY");
    return {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-Api-Key": apiKey, Authorization: `Bearer ${apiKey}` } : {})
    };
  }

  private buildGatewayUrl(path: string): string {
    const configuredBase =
      this.configService.get<string>("DEERFLOW_GATEWAY_BASE_URL") ??
      this.configService.get<string>("DEERFLOW_BASE_URL") ??
      "http://localhost:2026";

    let base = configuredBase.replace(/\/$/, "");
    // If DEERFLOW_BASE_URL is configured as .../api/langgraph for run APIs,
    // strip the trailing /langgraph for gateway APIs like /models and /mcp/config.
    if (/\/api\/langgraph(?:\/|$)/.test(base)) {
      base = base.replace(/\/api\/langgraph(?:\/)?$/, "/api");
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    if (normalizedPath.startsWith("/api/")) {
      return `${base}${normalizedPath}`;
    }
    // Base may already be /api or /api/langgraph.
    if (/\/api(?:\/|$)/.test(base)) {
      return `${base}${normalizedPath}`;
    }
    return `${base}/api${normalizedPath}`;
  }

  private isNotFound(error: unknown): boolean {
    const status = (error as AxiosError)?.response?.status;
    return status === 404;
  }

  private toGatewayException(error: unknown, method: HttpMethod, url: string): BadRequestException {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const detail =
      typeof axiosError.response?.data === "string"
        ? axiosError.response?.data
        : JSON.stringify(axiosError.response?.data ?? {});

    const message =
      `DeerFlow gateway ${method.toUpperCase()} ${url} failed` +
      (status ? ` (status: ${status})` : "") +
      (detail ? `: ${detail}` : "");

    this.logger.error(message);
    return new BadRequestException(message);
  }
}
