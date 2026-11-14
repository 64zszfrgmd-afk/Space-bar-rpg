import {it,expect} from 'vitest';import {Group} from 'three';
import {AvatarDiagnostics} from '../src/world/avatar-diagnostics';import {createHeroModel} from '../src/world/hero';import {freshState} from '../src/game/storage';import {disposeGroup} from '../src/world/aliens';
it('distinguishes selected, attached and main-scene rendered species, and retains bounded error/input history',()=>{
 const trace=new AvatarDiagnostics(),player=new Group(),model=createHeroModel({...freshState().hero,species:'orbion'});player.add(model);
 trace.record('pointerdown',{requestedSpecies:'orbion'});trace.begin('human','orbion');trace.stage('geometry-ready');
 expect(trace.snapshot('human',model,'third-person',true)).toMatchObject({selectedSpecies:'human',attachedSpecies:'orbion',renderedSpecies:null,avatarBuildStatus:'geometry-ready',avatarModelCount:1});
 trace.observe(model);trace.stage('ready');expect(trace.snapshot('orbion',model,'third-person',true)).toMatchObject({selectedSpecies:'orbion',renderedSpecies:'orbion',avatarVisible:true});
 trace.fail('main-scene',Error('GPU draw failed'));const report=trace.snapshot('orbion',model,'third-person',true);expect(report.lastAvatarError).toMatchObject({stage:'main-scene',message:'GPU draw failed'});expect(report.avatarHistory.some(e=>e.stage==='main-scene-drawn')).toBe(true);
 for(let i=0;i<120;i++)trace.record('pointercancel',{requestedSpecies:'ribbon'});expect(trace.snapshot('orbion',model,'first-person',false).avatarHistory).toHaveLength(80);expect(trace.snapshot('orbion',model,'first-person',false).lastAvatarError).toEqual(report.lastAvatarError);disposeGroup(player);
});
