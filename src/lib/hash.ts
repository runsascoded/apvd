'use client';
import {Dispatch, useEffect, useState} from 'react';

export const getHash = () => (typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.replace('#', '')) : undefined);

export const useHash = () => {
    const [hash, setHash] = useState(getHash());
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const handleHashChange = () => {
            setHash(getHash());
        };
        window.addEventListener("hashchange", handleHashChange);
        return () => {
            window.removeEventListener("hashchange", handleHashChange);
        };
    }, []);

    return isClient ? hash : null;
};

// export default function useHash(): [ string | undefined, Dispatch<string | undefined> ] {
//     const [ hash, setHash ] = useState(getHash());

    // useEffect(() => {
    //     const handleHashChange = () => {
    //         const curHash = getHash()
    //         console.log("handleHashChange:", curHash)
    //         setHash(curHash);
    //     };
    //     window.addEventListener('hashchange', handleHashChange);
    //     return () => {
    //         window.removeEventListener('hashchange', handleHashChange);
    //     };
    // }, []);

    // return [ hash, setHash, ];
// };
