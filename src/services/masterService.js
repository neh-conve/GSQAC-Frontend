import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../config/axios";

/**
 * Master geo data from local DB tables (district_master, block_master, cluster_master).
 */

export async function getAllDistricts() {
  const response = await axiosInstance.get("/master/all-districts");
  return response.data;
}

export async function getDistrictWiseBlocks(districtId) {
  const response = await axiosInstance.get("/master/blocks-by-districtId", {
    params: { districtId },
  });
  return response.data;
}

export async function getClustersByBlockId(blockId) {
  const response = await axiosInstance.get("/master/clusters-by-blockId", {
    params: { blockId },
  });
  return response.data;
}

export function useGetAllDistrictsQuery(options = {}) {
  return useQuery({
    queryKey: ["master", "all-districts"],
    queryFn: () => getAllDistricts(),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useGetDistrictWiseBlocksQuery(districtId, options = {}) {
  return useQuery({
    queryKey: ["master", "district-wise-blocks", districtId],
    queryFn: () => getDistrictWiseBlocks(districtId),
    enabled: Boolean(districtId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useGetClustersByBlockIdQuery(blockId, options = {}) {
  return useQuery({
    queryKey: ["master", "clusters-by-blockId", blockId],
    queryFn: () => getClustersByBlockId(blockId),
    enabled: Boolean(blockId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}
