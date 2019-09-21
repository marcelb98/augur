import Repo from '@/AugurAPI';
import RepoGroup from '@/AugurAPI';
export default {
    retrieveRepoIds (context: any, payload: any){
        
        console.log(payload)
        let repo_name: any = payload.repo 
        if (repo_name.includes('https://github.com/'))
            repo_name = repo_name.substr(19)
        if (repo_name.includes('.git'))
            repo_name = repo_name.substr(0,repo_name.length - 4)
        if (repo_name.includes('/'))
            repo_name = repo_name.split('/')[1]
        console.log("retrieving ids",context.getters['repoRelations'], payload.rg_name, repo_name)
        try {
            console.log(context.getters['repoRelations'][payload.rg_name][repo_name].repo_id)
            return new Promise((resolve, reject) => {
                resolve({
                    'repo_id': context.getters['repoRelations'][payload.rg_name][repo_name].repo_id,
                    'repo_group_id': context.getters['repoRelations'][payload.rg_name][repo_name].repo_group_id
                })
            }).catch((e) => {
                console.log('error occurred in retrieving ids: ', e)
            })
        } catch (e) {
            return new Promise((resolve, reject) => {
                resolve({
                    'repo_id': context.getters['repoRelations'][payload.rg_name][repo_name].repo_id,
                    'repo_group_id': context.getters['repoRelations'][payload.rg_name][repo_name].repo_group_id
                })
            }).catch((e) => {
                console.log('error occurred in retrieving ids: ', e)
            })
        }
        // return new Promise((resolve, reject) => {
        //     resolve({
        //         'repo_id': context.getters['repoRelations'][payload.rg_name][repo_name].repo_id,
        //         'repo_group_id': context.getters['repoRelations'][payload.rg_name][repo_name].repo_group_id
        //     })
        // }).catch((e) => {
        //     console.log('error occurred in retrieving ids: ', e, context, '\nloading repos and repogroups')
        //     context.dispatch('loadRepoGroups').then(() => {
        //         context.dispatch('loadRepos').then(() => {
                    
        //         })
        //     })
        // });
        // gitURL: to.params.url,
        // rg_name: to.params.repo_group_id
    },
    async createAPIObjects(context: any, payload: any) {
        try {
            let apiGroups = context.state.getRepoGroups || {};
            let apiRepos = context.state.getRepos || {};
            console.log("DOING IT")
            if ('repos' in payload) {
                payload.repos.forEach((repo: any) => {
                    apiRepos[repo.url] = context.state.AugurAPI.Repo({gitURL: repo.url,
                        repo_id:repo.repo_id})
                })
            }
            if ('groups' in payload) {
                payload.groups.forEach((group: any) => {
                    apiGroups[group.rg_name] = context.state.AugurAPI.RepoGroup({rg_name:
                        group.rg_name, repo_group_id: group.repo_group_id})
                })
            }
            context.commit('update_properties', {
                property: 'apiRepos',
                with: apiRepos,
            });
            context.commit('update_properties', {
                property: 'apiGroups',
                with: apiGroups,
            });
        } catch (error) {
            throw error;
        }
    },
    async endpoint(context: any, payload: any) {
        try {
            return new Promise((resolve, reject) => {
                let tempCache = context.state.cache || {};
                if ('endpoints' in payload && 'repos' in payload) {
                    tempCache = {}
                    let promises: any[] = []
                    payload.repos.forEach((repo: any) => {
                        let ref = repo.url || repo.repo_name
                        // tempCache[repo.rg_name] = tempCache[repo.rg_name] || {}
                        tempCache[ref] = tempCache[repo.url] || {}
                        
                        payload.endpoints.forEach((endpoint: string) => {
                            tempCache[ref][endpoint] = tempCache[ref][endpoint] ? tempCache[ref][endpoint] : null
                            promises.push(repo[endpoint]())
                        })
                    })
                    Promise.all(promises).then((data: any) => {
                        console.log("repo endpoints promise.all hit, data: ",data)
                        let i = 0
                        payload.repos.forEach((repo: any) => {
                            let ref = repo.url || repo.repo_name
                            payload.endpoints.forEach((endpoint: string) => {
                                tempCache[ref][endpoint] = data[i]// || []
                            })
                            i++
                        })
                    }).finally(() => {
                        let allDone = true

                        payload.repos.forEach((repo: any) => {
                            let ref = repo.url || repo.repo_name
                            payload.endpoints.forEach((endpoint: string) => {
                                if (!tempCache[ref][endpoint])
                                    allDone = false
                            })
                        })
                        if (allDone) {
                            console.log("All repo endpoints loaded, tempCache is as follows:", tempCache)
                            resolve(tempCache)
                        }
                    }).catch((error) => {
                        console.log(error)
                    })
                }
                if ('endpoints' in payload && 'repoGroups' in payload) {
                    tempCache = {}
                    let promises: any[] = []
                    payload.repoGroups.forEach((group: any) => {
                        tempCache[group.rg_name] = tempCache[group.rg_name] ? tempCache[group.rg_name] : {}
                        tempCache[group.rg_name]['groupEndpoints'] = tempCache[group.rg_name]['groupEndpoints'] ? tempCache[group.rg_name]['groupEndpoints'] : {}

                        payload.endpoints.forEach((endpoint: string) => {
                            tempCache[group.rg_name]['groupEndpoints'][endpoint] = tempCache[group.rg_name]['groupEndpoints'][endpoint] ? tempCache[group.rg_name]['groupEndpoints'][endpoint] : null
                            promises.push(group[endpoint]())
                        })
                    })

                    console.log(promises, JSON.stringify(tempCache))

                    Promise.all(promises).then((data: any) => {
                        console.log(data)
                        let i = 0
                        payload.repoGroups.forEach((group: any) => {
                            payload.endpoints.forEach((endpoint: string) => {
                                tempCache[group.rg_name]['groupEndpoints'][endpoint] = data[i]// || []
                            })
                            i++
                        })
                        console.log(tempCache)
                    }).finally(() => {
                        let allDone = true
                        payload.repoGroups.forEach((group: any) => {
                            payload.endpoints.forEach((endpoint: string) => {
                                if (!tempCache[group.rg_name]['groupEndpoints'][endpoint])
                                    allDone = false
                            })
                        })
                        if (allDone){
                            console.log("All repo group endpoints loaded, tempCache is as follows: ", tempCache)
                            resolve(tempCache)
                        }
                    }).catch((e) => {
                        console.log("Endpoint for rg failed, error: ",e)
                    })
                        
                    
                    // resolve(tempCache)
                    // context.state.AugurAPI.batchMapped(payload.repoGroups, payload.endpoints).then(
                    //     (data: object[]) => {
                    //         tempCache = {...tempCache, ...data};
                    //         payload.repoGroups.forEach((group: any) => {
                    //             tempCache[group.rg_name] = {...tempCache[group.rg_name],
                    //                 ...data[group.rg_name]};
                    //         });
                    //         console.log(tempCache)
                    //         resolve(tempCache)
                    //     });
                }
                if ('endpoints' in payload && !('repos' in payload) && !('repoGroups' in payload)) {
                    payload.endpoints.forEach((endpoint: string) => {
                        console.log(endpoint)
                        context.state.AugurAPI[endpoint]().then((data: object[]) => {
                            tempCache[endpoint] = data;
                            console.log(tempCache)
                            resolve(tempCache)
                        });
                    });
                }
                // console.log(tempCache)
                // resolve(tempCache)
                // context.commit('mutate', {
                //     property: 'cache',
                //     with: tempCache,
                // });
                // resolve(tempCache)
            }).catch((e) => {
                console.log(e)
            });
        } catch (error) {
            throw error;
        }
    },
    async loadRepos(context:any, payload:any){
        try {
            return context.state.AugurAPI.getRepos().then((repos: object[]) => {
                console.log("Loaded repos: ", repos)
                context.commit('mutateCache', {
                    property: 'getRepos',
                    with: repos,
                });
                return repos
            })
        } catch(error) {
            throw error;
        }
    },
    async loadRepoGroups(context:any, payload:any){
        try {
            console.log("Attempting to load repo groups...")
            console.log(context.state)
            return context.state.AugurAPI.getRepoGroups().then((rgs: object[]) => {
                console.log("Loaded repo groups: ", rgs)
                context.commit('mutateCache', {
                    property: 'getRepoGroups',
                    with: rgs,
                });
                return rgs
            });
        } catch(error) {
            throw error;
        }
    },
    // async loadRepoRelations(context:any, payload:any){
    //     try {

    //         context.dispatch('loadRepoGroups').then(() => {
    //             context.state.getters.repoGroups.forEach((group: any): void => {
    //                 repoGroups[group.rg_name] = group
    //                 repoRelations[group.rg_name] = {};
    //                 repos.filter((repo: any) => {
    //                     return repo.rg_name === group.rg_name;
    //                 }).forEach((repo: any) => {
    //                     repoRelations[group.rg_name][repo.url] = repo
    //                 });
    //             });
    //             context.commit('mutateCache', {
    //                 property: 'repoRelations',
    //                 with: repoRelations,
    //             });
    //         })
    //     } catch(error) {
    //         throw error;
    //     }
    // },
    // getRepoRelations(context: any, payload: object) {
    //     return new Promise ((resolve, reject) => {
    //         setTimeout(() => {
    //             let repoRelations = context.state.cache.getRepos || {};
    //             let repoGroups = context.state.cache.getRepoGroups || {};
    //             context.state.AugurAPI.getRepos().then((repos: object[]) => {
    //                 context.state.AugurAPI.getRepoGroups().then((groups: object[]) => {
    //                     // Move down between future relation endpoint
    //                     groups.forEach((group: any): void => {
    //                         repoGroups[group.rg_name] = group
    //                         repoRelations[group.rg_name] = {};
    //                         repos.filter((repo: any) => {
    //                             return repo.rg_name === group.rg_name;
    //                         }).forEach((repo: any) => {
    //                             repoRelations[group.rg_name][repo.url] = repo
    //                         });
    //                     });
    //                     context.commit('mutateCache', {
    //                         property: 'repoRelations',
    //                         with: repoRelations,
    //                     });
    //                     context.commit('mutateCache', {
    //                         property: 'repoGroups',
    //                         with: repoGroups,
    //                     });
    //                 });
    //             resolve({ repoRelations, repoGroups });
    //             });
    //         }, 2000)
    //     })
    // },
    async addRepo(context: any, payload: any) {
        return new Promise((resolve, reject) => {
            setTimeout(()=> {
                let rg_name = payload.rg_name || undefined
                let repo_name = payload.repo_name || payload.repo || undefined
                let repo_id = payload.repo_id || undefined
                let repo_group_id = payload.repo_group_id || undefined
                let gitURL = payload.gitURL || payload.url || undefined
                console.log("about to add repo: ", gitURL,
                  repo_id,
                  repo_group_id,
                  rg_name,
                  repo_name)
                let repo: Repo = context.state.AugurAPI.Repo({
                  gitURL: gitURL,
                  repo_id: repo_id,
                  repo_group_id: repo_group_id,
                  rg_name: rg_name,
                  repo_name: repo_name
                })
                console.log("api repo: ", repo)
                context.commit('mutateAPIRepo', {repo: repo, name: repo.toString()})
                resolve(repo)
            })
        })
    },
    async addRepoGroup(context:any, payload:any) {
        return new Promise((resolve,reject)=>{
            setTimeout(()=> {
                let rg_name = payload.rg_name || undefined;
                let repo_group_id = payload.repo_group_id || undefined
                let group: RepoGroup = context.state.AugurAPI.RepoGroup({
                    repo_group_id: repo_group_id,
                    rg_name: rg_name
                })
                context.commit('mutateAPIGroup', {group: group, rg_name: rg_name})
                // console.log("added api group to the state: ", group)
                resolve(group)
            })
        })
    }
};
