"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { programs, mergePrograms, type Program } from "@/models/programs";

const ProgramContext = createContext<Program[]>(programs);
export function ProgramImagesProvider({children}:{children:ReactNode}) {
  const [items,setItems] = useState<Program[]>(programs);
  useEffect(()=>{
    const controller = new AbortController();
    Promise.allSettled([
      apiRequest("","/public/programs",{signal:controller.signal,cache:"no-store"}),
      apiRequest("","/public/program-images",{signal:controller.signal,cache:"no-store"}),
    ]).then(([content,images])=>{
      if(controller.signal.aborted)return;
      const overrides = content.status === "fulfilled" ? content.value.data || [] : [];
      const imageMap = images.status === "fulfilled" ? Object.fromEntries((images.value.data || []).map((row:{slug:string;imageUrl:string})=>[row.slug,row.imageUrl])) : {};
      setItems(mergePrograms(overrides,imageMap).filter(program=>program.published!==false));
    });
    return ()=>controller.abort();
  },[]);
  return <ProgramContext.Provider value={items}>{children}</ProgramContext.Provider>;
}
export function usePrograms(){return useContext(ProgramContext);}
export function useProgramImage(slug:string,fallback:string) {return usePrograms().find(program=>program.slug===slug)?.image || fallback;}
