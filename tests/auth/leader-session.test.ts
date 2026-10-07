import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({role:'member',visible:false,officer:false}));
vi.mock('../../src/db/client',()=>({getDb:()=>({select:()=>({from:()=>({innerJoin:()=>({where:()=>({limit:async()=>[{id:'person',displayName:'Test',samId:null,role:state.role}]})})})})})}));
vi.mock('../../src/features/pastoral/access',()=>({reportAccess:vi.fn(async()=>({visible:state.visible}))}));
vi.mock('../../src/features/auth/officer',()=>({isApprovedOfficer:vi.fn(async()=>state.officer)}));
import {getSessionUser} from '../../src/features/auth/session';
beforeEach(()=>{process.env.DATABASE_URL='postgres://example';process.env.SESSION_SECRET='s'.repeat(32);process.env.PHONE_LOOKUP_PEPPER='p'.repeat(32);state.role='member';state.visible=false;state.officer=false;});
it('rejects an existing ordinary member session',async()=>{expect(await getSessionUser('token')).toBeNull();});
it('accepts a bound leader session',async()=>{state.visible=true;expect(await getSessionUser('token')).not.toBeNull();});
it('keeps administrator access without leader assignment',async()=>{state.role='admin';expect(await getSessionUser('token')).not.toBeNull();});

it('accepts an approved treasurer without a leader assignment',async()=>{state.officer=true;expect(await getSessionUser('token')).not.toBeNull();});
it('revokes officer access when approval is removed',async()=>{state.officer=true;expect(await getSessionUser('token')).not.toBeNull();state.officer=false;expect(await getSessionUser('token')).toBeNull();});
