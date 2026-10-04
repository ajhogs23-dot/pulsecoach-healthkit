import {beforeEach,describe,expect,it,vi} from "vitest";
import {DEFAULT_PROFILE_PREFERENCES} from "../shared/personal-details";
import {DEFAULT_ONBOARDING} from "../shared/onboarding";
import type {TrpcContext} from "../server/_core/context";
const mock=vi.hoisted(()=>({save:vi.fn(),get:vi.fn()}));
vi.mock("../server/db",()=>({savePersonalDetails:mock.save,getPersonalDetails:mock.get}));
vi.mock("../server/account-deactivation",()=>({guardAccountMutation:async(_id:number,_generation:string,action:()=>Promise<unknown>)=>action()}));
import {appRouter} from "../server/routers";
const caller=()=>appRouter.createCaller({user:{id:7,openId:"test:7",name:"Test",role:"user"},req:{},res:{}} as TrpcContext);
beforeEach(()=>{mock.save.mockReset();mock.save.mockImplementation(async(_id,_name,details)=>details);});
describe("onboarding profile API",()=>{
  it("saves setup without an unrecognized onboarding key and retains multiple goals and consent",async()=>{
    const onboarding={...DEFAULT_ONBOARDING,completed:true,dateOfBirth:"1994-05-01",fitnessGoals:["Build muscle","Improve endurance"] as const,workoutStyles:["Strength training","Cardio focus"] as typeof DEFAULT_ONBOARDING.workoutStyles,injuries:["Knees"] as const,injuryNotes:"Limited ankle movement",otherSupplements:["Magnesium"],termsAcceptance:{version:"test-2026-10-05",acceptedAt:"2026-10-05T00:00:00.000Z"}};
    const result=await caller().profile.savePersonalDetails({...DEFAULT_PROFILE_PREFERENCES,name:"Test",onboarding:{...onboarding,fitnessGoals:[...onboarding.fitnessGoals],injuries:[...onboarding.injuries]}});
    expect(result.onboarding).toEqual(onboarding);expect(mock.save).toHaveBeenCalledWith(7,"Test",expect.objectContaining({onboarding}));
  });
  it("still accepts profiles from the existing app",async()=>{await caller().profile.savePersonalDetails({...DEFAULT_PROFILE_PREFERENCES,name:"Test"});expect(mock.save).toHaveBeenCalledTimes(1);});
  it("rejects invalid dates and unknown setup keys before saving",async()=>{await expect(caller().profile.savePersonalDetails({...DEFAULT_PROFILE_PREFERENCES,name:"Test",onboarding:{...DEFAULT_ONBOARDING,dateOfBirth:"1994-02-31"}})).rejects.toThrow();await expect(caller().profile.savePersonalDetails({...DEFAULT_PROFILE_PREFERENCES,name:"Test",onboarding:{...DEFAULT_ONBOARDING,dateOfBirth:"1994-05-01",unknownField:true} as any})).rejects.toThrow();expect(mock.save).not.toHaveBeenCalled();});
});
